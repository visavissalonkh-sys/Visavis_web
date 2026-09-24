import { addDays, endOfWeek, startOfWeek, subDays } from "date-fns";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, bumpTokenVersion, type SessionPayload } from "@/lib/auth";
import { redis } from "@/lib/redis";
import {
  CriticalSectionBusyError,
  SlotUnavailableError,
  addMinutesToTime,
  formatBookingDateTimeUk,
  formatDateOnly,
  getAvailableSlots,
  parseDateOnly,
  timeToMinutes,
  withMasterDayLock,
} from "@/lib/booking";
import { cancelReminders, scheduleReminders, visitStartsAt } from "@/lib/reminders";
import { sendTelegramMessage } from "@/lib/notifications";
import { normalizePhone } from "@/lib/phone";
import { getSalonToday } from "@/lib/timezone";

export { SlotUnavailableError, CriticalSectionBusyError };

/** `reason: "no_session"` means not logged in at all (send to the login
 * modal); `"not_admin"` means logged in but the fresh DB check says this
 * account isn't (or no longer is) an admin — this is the case that catches
 * a stale JWT after a demotion, and deserves a different redirect (they
 * have an account, just not this permission) than "please log in". */
export class NotAdminError extends Error {
  constructor(public readonly reason: "no_session" | "not_admin") {
    super(reason);
  }
}

export type AdminContext = { session: SessionPayload; adminId: string };

/**
 * Unlike getSession() (JWT-only — fast, no DB), this re-reads the user's
 * role from Postgres on every single call instead of trusting the JWT's
 * `role` claim. A role can go stale the moment an admin is demoted, and
 * admin actions are high-stakes enough to pay for a fresh by-primary-key
 * lookup every time rather than trust a token that might be minutes or
 * hours old. Every /api/admin/* route must start with this — Level 2 of
 * the three-level check (middleware → this → audit log).
 */
export async function requireAdmin(): Promise<AdminContext> {
  const session = await getSession();
  if (!session) throw new NotAdminError("no_session");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } });
  if (!user || user.role !== "admin") throw new NotAdminError("not_admin");

  return { session, adminId: session.sub };
}

/**
 * Level 3 of the admin security model: every admin action gets one
 * immutable row here. There is deliberately no update/delete path for this
 * table anywhere in the codebase — only prisma.adminAuditLog.create calls
 * (this one, and the pre-existing logMasterAudit in lib/master.ts, which
 * predates the ip/userAgent/oldValue/newValue columns and doesn't set
 * them — those stay null on that older set of actions).
 */
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ip: string;
  userAgent: string | null;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

const ACCESS_LOG_DEDUP_SECONDS = 600;

/**
 * Level 3's "log every entry to /admin" from the spec, made practical: the
 * admin layout wraps every single page under /admin, so a literal per-
 * request log would also fire on Next's own Link-prefetch requests and
 * every internal client-side navigation RSC fetch — noise, not signal, and
 * a self-inflicted way to flood this table. This logs the first access in
 * a rolling 10-minute window per session (keyed by jti) and skips the rest
 * of that window — one atomic Redis SET NX, so concurrent requests can't
 * both win and double-log. Still gives full IP/User-Agent forensics on
 * "did this admin access the panel, from where" without the noise.
 */
export async function logAdminAccessOnce(params: {
  adminId: string;
  jti: string;
  ip: string;
  userAgent: string | null;
}): Promise<void> {
  const key = `admin:access-logged:${params.jti}`;
  const wonRace = await redis.set(key, "1", "EX", ACCESS_LOG_DEDUP_SECONDS, "NX");
  if (wonRace === null) return;

  await logAdminAction({
    actorId: params.adminId,
    action: "admin_access",
    entityType: "admin_panel",
    entityId: params.adminId,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}

/**
 * Kills every session the target user currently has open, on every device,
 * immediately — used after changing someone's role or deactivating a
 * master, so a stale JWT can't keep granting the old role/access for the
 * rest of its natural lifetime (up to 30 days for a client/master token).
 */
export async function blacklistUserJWTs(userId: string): Promise<void> {
  await bumpTokenVersion(userId);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const OCCUPYING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed"];
const ALL_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const WORKLOAD_SLOT_MINUTES = 30;
const RECENT_ACTIONS_LIMIT = 20;

export type AdminDashboardFilters = {
  locationId?: string;
  masterId?: string;
  status?: BookingStatus;
};

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

export async function getAdminDashboardData(filters: AdminDashboardFilters = {}) {
  const today = getSalonToday();
  const tomorrow = addDays(today, 1);
  const weekFrom = startOfWeek(today, { weekStartsOn: 1 });
  const weekTo = endOfWeek(today, { weekStartsOn: 1 });
  const sevenDaysAgo = subDays(new Date(), 7);
  const todayWeekday = new Date().getDay(); // 0 = Sunday .. 6 = Saturday, matches the schema's convention

  const [
    todayBookingsAll,
    weekTotal,
    newClientsCount,
    activeMasters,
    locations,
    recentActionsRaw,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { date: today },
      include: { client: true, master: true, service: true, location: true },
      orderBy: { timeFrom: "asc" },
    }),
    prisma.booking.count({ where: { date: { gte: weekFrom, lte: weekTo } } }),
    prisma.user.count({ where: { role: "client", createdAt: { gte: sevenDaysAgo } } }),
    prisma.master.findMany({
      where: { isActive: true },
      include: { masterLocations: true, availabilityOverrides: { where: { date: today } } },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: RECENT_ACTIONS_LIMIT }),
  ]);

  const todayConfirmed = todayBookingsAll.filter((b) => b.status === "confirmed").length;
  const todayCancelled = todayBookingsAll.filter((b) => b.status === "cancelled").length;

  const filteredTodayBookings = todayBookingsAll.filter((b) => {
    if (filters.locationId && b.locationId !== filters.locationId) return false;
    if (filters.masterId && b.masterId !== filters.masterId) return false;
    if (filters.status && b.status !== filters.status) return false;
    return true;
  });

  const masterWorkload = activeMasters.map((master) => {
    const dayOff = master.availabilityOverrides.some((o) => o.type === "day_off");

    const workingMinutesToday = master.masterLocations
      .filter((ml) => ml.weekday === todayWeekday)
      .reduce((sum, ml) => sum + Math.max(0, timeToMinutes(ml.timeTo) - timeToMinutes(ml.timeFrom)), 0);

    const bookedCount = todayBookingsAll.filter(
      (b) => b.masterId === master.id && OCCUPYING_STATUSES.includes(b.status),
    ).length;

    const totalSlots = dayOff ? 0 : Math.round(workingMinutesToday / WORKLOAD_SLOT_MINUTES);

    return {
      masterId: master.id,
      masterName: master.name,
      isDayOff: dayOff || workingMinutesToday === 0,
      bookedSlots: bookedCount,
      totalSlots,
      percentage: totalSlots > 0 ? Math.min(100, Math.round((bookedCount / totalSlots) * 100)) : 0,
    };
  });

  const actorIds = [...new Set(recentActionsRaw.map((a) => a.actorId))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, phone: true } })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return {
    metrics: {
      todayTotal: todayBookingsAll.length,
      todayConfirmed,
      todayCancelled,
      weekTotal,
      activeMastersToday: masterWorkload.filter((m) => m.bookedSlots > 0).length,
      newClientsLast7Days: newClientsCount,
    },
    todayBookings: filteredTodayBookings.map((b) => ({
      id: b.id,
      timeFrom: b.timeFrom,
      clientName: b.client.name,
      clientPhone: b.client.phone,
      masterName: b.master.name,
      serviceName: b.service.name,
      locationName: b.location.name,
      status: b.status,
    })),
    masterWorkload,
    recentActions: recentActionsRaw.map((a) => ({
      id: a.id,
      actorName: actorById.get(a.actorId)?.name ?? actorById.get(a.actorId)?.phone ?? a.actorId,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt.toISOString(),
    })),
    filterOptions: {
      locations,
      masters: activeMasters.map((m) => ({ id: m.id, name: m.name })),
      statuses: ALL_STATUSES,
    },
  };
}

// ---------------------------------------------------------------------------
// Bookings: list (filters + sort + pagination), manual create, cancel
// ---------------------------------------------------------------------------

export const ADMIN_BOOKINGS_PAGE_SIZE = 50;
const CANCELLABLE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export class BookingNotFoundError extends Error {}
export class BookingAlreadyInactiveError extends Error {}
export class MasterServiceMismatchError extends Error {}
export class InvalidPhoneError extends Error {}
export class PastDateError extends Error {}

export type AdminBookingsSortBy = "date" | "client" | "master" | "service" | "location" | "status";
export type AdminBookingsFilters = {
  dateFrom?: string;
  dateTo?: string;
  masterId?: string;
  locationId?: string;
  statuses?: BookingStatus[];
  search?: string;
  sortBy?: AdminBookingsSortBy;
  sortDir?: "asc" | "desc";
  page: number;
};

function buildBookingsOrderBy(
  sortBy: AdminBookingsSortBy | undefined,
  dir: "asc" | "desc",
): Prisma.BookingOrderByWithRelationInput[] {
  switch (sortBy) {
    case "client":
      return [{ client: { name: dir } }];
    case "master":
      return [{ master: { name: dir } }];
    case "service":
      return [{ service: { name: dir } }];
    case "location":
      return [{ location: { name: dir } }];
    case "status":
      return [{ status: dir }, { date: "desc" }];
    case "date":
    default:
      return [{ date: dir }, { timeFrom: dir }];
  }
}

export type AdminBookingsList = Awaited<ReturnType<typeof getAdminBookingsList>>;

export async function getAdminBookingsList(filters: AdminBookingsFilters) {
  const where: Prisma.BookingWhereInput = {
    date: {
      gte: filters.dateFrom ? parseDateOnly(filters.dateFrom) : undefined,
      lte: filters.dateTo ? parseDateOnly(filters.dateTo) : undefined,
    },
    masterId: filters.masterId || undefined,
    locationId: filters.locationId || undefined,
    status: filters.statuses && filters.statuses.length > 0 ? { in: filters.statuses } : undefined,
    client: filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
          ],
        }
      : undefined,
  };

  const orderBy = buildBookingsOrderBy(filters.sortBy, filters.sortDir ?? "desc");

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { client: true, master: true, service: true, location: true },
      orderBy,
      skip: (filters.page - 1) * ADMIN_BOOKINGS_PAGE_SIZE,
      take: ADMIN_BOOKINGS_PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      date: formatDateOnly(b.date),
      timeFrom: b.timeFrom,
      clientName: b.client.name,
      clientPhone: b.client.phone,
      masterName: b.master.name,
      serviceName: b.service.name,
      locationName: b.location.name,
      status: b.status,
      canCancel: CANCELLABLE_STATUSES.includes(b.status),
    })),
    total,
    page: filters.page,
    pageSize: ADMIN_BOOKINGS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_BOOKINGS_PAGE_SIZE)),
  };
}

/** For populating the bookings page's filter dropdowns and the "create
 * manually" form — one call instead of several small endpoints. */
export async function getAdminBookingFormOptions() {
  const [locations, masters, services] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.master.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { specialties: { select: { serviceId: true } } },
    }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMinutes: true } }),
  ]);

  return {
    locations,
    masters: masters.map((m) => ({ id: m.id, name: m.name, serviceIds: m.specialties.map((s) => s.serviceId) })),
    services,
    statuses: ALL_STATUSES,
  };
}

/** Existing client by phone, for the "type a phone number" step of manual
 * booking creation — lets the admin confirm they found the right person
 * before creating a new account for someone who already has one. */
export async function lookupClientByPhone(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, name: true, phone: true, role: true } });
  return user;
}

export async function cancelAdminBooking(
  bookingId: string,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, master: { include: { user: true } }, service: true, location: true },
  });
  if (!booking) throw new BookingNotFoundError();
  if (!CANCELLABLE_STATUSES.includes(booking.status)) throw new BookingAlreadyInactiveError();

  const oldStatus = booking.status;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
  await cancelReminders(bookingId);

  const whenText = formatBookingDateTimeUk(booking.date, booking.timeFrom);

  if (booking.master.user.telegramId) {
    sendTelegramMessage(
      booking.master.user.telegramId.toString(),
      `❌ <b>Запис скасовано адміністратором</b>\n\n${booking.service.name}, ${whenText}\n${booking.location.address}`,
    ).catch((error) => console.error("Failed to notify master of admin cancellation", error));
  }
  if (booking.client.telegramId) {
    sendTelegramMessage(
      booking.client.telegramId.toString(),
      `Ваш запис на ${whenText} скасовано адміністрацією. Перепрошуємо за незручності — оберіть, будь ласка, інший час на сайті.`,
    ).catch((error) => console.error("Failed to notify client of admin cancellation", error));
  }

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_booking_cancelled",
    entityType: "booking",
    entityId: bookingId,
    oldValue: { status: oldStatus },
    newValue: { status: "cancelled" },
    ip,
    userAgent,
  });

  return booking;
}

export type AdminCreateBookingInput = {
  clientPhone: string;
  clientName?: string;
  serviceId: string;
  masterId: string;
  locationId: string;
  date: string;
  timeFrom: string;
  comment?: string;
};

/**
 * The call-center path: an admin books on a client's behalf over the
 * phone, no OTP involved. Status goes straight to "confirmed" (not the
 * "pending" a client's own self-service booking gets) — an admin who just
 * coordinated the time with the client on the phone has already done the
 * confirming; there's no one left who needs to approve it.
 */
export async function createAdminBooking(input: AdminCreateBookingInput, admin: AdminContext, ip: string, userAgent: string | null) {
  const phone = normalizePhone(input.clientPhone);
  if (!phone) throw new InvalidPhoneError();

  const [service, master, location, specialty] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, isActive: true } }),
    prisma.master.findFirst({ where: { id: input.masterId, isActive: true }, include: { user: true } }),
    prisma.location.findFirst({ where: { id: input.locationId, isActive: true } }),
    prisma.masterSpecialty.findUnique({
      where: { masterId_serviceId: { masterId: input.masterId, serviceId: input.serviceId } },
    }),
  ]);
  if (!service || !master || !location) throw new BookingNotFoundError();
  if (!specialty) throw new MasterServiceMismatchError();

  const parsedDate = parseDateOnly(input.date);
  if (parsedDate < getSalonToday()) throw new PastDateError();

  const timeTo = addMinutesToTime(input.timeFrom, service.durationMinutes);

  let client = await prisma.user.findUnique({ where: { phone } });
  if (!client) {
    client = await prisma.user.create({ data: { phone, name: input.clientName?.trim() || null, role: "client" } });
  }

  const booking = await withMasterDayLock(input.masterId, input.date, async () => {
    const slots = await getAvailableSlots({
      masterId: input.masterId,
      locationId: input.locationId,
      date: parsedDate,
      durationMinutes: service.durationMinutes,
    });
    if (!slots.includes(input.timeFrom)) throw new SlotUnavailableError();

    return prisma.booking.create({
      data: {
        clientId: client!.id,
        masterId: input.masterId,
        locationId: input.locationId,
        serviceId: input.serviceId,
        date: parsedDate,
        timeFrom: input.timeFrom,
        timeTo,
        comment: input.comment,
        status: "confirmed",
        paymentStatus: "not_required",
        createdVia: "web",
      },
    });
  });

  const visitAt = visitStartsAt(parsedDate, input.timeFrom);
  await scheduleReminders(booking.id, visitAt);

  const whenText = formatBookingDateTimeUk(parsedDate, input.timeFrom);

  if (master.user.telegramId) {
    sendTelegramMessage(
      master.user.telegramId.toString(),
      [
        "📅 <b>Новий запис (адміністратор)</b>",
        "",
        `Клієнт: ${client.name ?? client.phone}`,
        `Послуга: ${service.name}`,
        `Дата: ${whenText}`,
        `Філіал: ${location.address}`,
      ].join("\n"),
    ).catch((error) => console.error("Failed to notify master of admin-created booking", error));
  }
  if (client.telegramId) {
    sendTelegramMessage(
      client.telegramId.toString(),
      [
        "✅ <b>Вас записано!</b>",
        "",
        `Майстер: ${master.name}`,
        `Послуга: ${service.name}`,
        `📅 ${whenText}`,
        `📍 ${location.address}`,
      ].join("\n"),
    ).catch((error) => console.error("Failed to notify client of admin-created booking", error));
  }

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_booking_created",
    entityType: "booking",
    entityId: booking.id,
    newValue: {
      clientId: client.id,
      clientPhone: phone,
      masterId: input.masterId,
      serviceId: input.serviceId,
      locationId: input.locationId,
      date: input.date,
      timeFrom: input.timeFrom,
    },
    ip,
    userAgent,
  });

  return booking;
}
