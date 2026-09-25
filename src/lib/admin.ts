import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek, subDays } from "date-fns";
import ExcelJS from "exceljs";
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
import {
  getMasterProfile,
  updateMasterProfile,
  updateRegularSchedule,
  InvalidScheduleError,
  type RegularScheduleDay,
} from "@/lib/master";
import { generateOtpCode, storeOtp, verifyOtp, type VerifyOtpResult } from "@/lib/otp";
import { slugify, ensureUniqueSlug } from "@/lib/slug";
import { STATUS_LABELS } from "@/components/master/status-badge";

export { InvalidScheduleError };

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

// ---------------------------------------------------------------------------
// Re-auth (step-up OTP for critical actions — master deactivation, role change)
// ---------------------------------------------------------------------------

const REAUTH_TTL_SECONDS = 5 * 60;

export class ReauthRequiredError extends Error {}

function reauthKey(jti: string): string {
  return `admin:reauth:${jti}`;
}

async function grantReauth(jti: string): Promise<void> {
  await redis.set(reauthKey(jti), "1", "EX", REAUTH_TTL_SECONDS);
}

async function hasValidReauth(jti: string): Promise<boolean> {
  return (await redis.get(reauthKey(jti))) !== null;
}

/** Throws if this admin session hasn't completed step-up OTP in the last 5
 * minutes. Every route for a "critical action" (master deactivation, role
 * change) must call this after requireAdmin() and before doing anything. */
export async function requireRecentReauth(admin: AdminContext): Promise<void> {
  if (!(await hasValidReauth(admin.session.jti))) throw new ReauthRequiredError();
}

/** Sends a fresh OTP to the admin's OWN linked Telegram — same mechanism as
 * login, reused here as step-up auth rather than a second, parallel one. */
export async function sendAdminReauthOtp(admin: AdminContext): Promise<{ telegramLinked: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: admin.adminId } });
  if (!user?.telegramId) return { telegramLinked: false };

  const code = generateOtpCode();
  await storeOtp(admin.session.phone, code);
  await sendTelegramMessage(
    user.telegramId.toString(),
    `Код підтвердження дії в адмін-панелі: <b>${code}</b>\nДійсний 5 хвилин. Нікому його не повідомляйте.`,
  );
  return { telegramLinked: true };
}

export async function verifyAdminReauthOtp(admin: AdminContext, code: string): Promise<VerifyOtpResult> {
  const result = await verifyOtp(admin.session.phone, code);
  if (result === "ok") await grantReauth(admin.session.jti);
  return result;
}

// ---------------------------------------------------------------------------
// Masters: list, detail, create, update, deactivate/reactivate
// ---------------------------------------------------------------------------

export class MasterNotFoundError extends Error {}
export class MasterPhoneConflictError extends Error {}

async function generateUniqueMasterSlug(name: string): Promise<string> {
  return ensureUniqueSlug(slugify(name) || "master", async (slug) => (await prisma.master.findUnique({ where: { slug } })) !== null);
}

export type AdminMastersList = Awaited<ReturnType<typeof getAdminMastersList>>;

export async function getAdminMastersList() {
  const now = new Date();
  const [masters, counts] = await Promise.all([
    prisma.master.findMany({
      orderBy: { name: "asc" },
      include: {
        specialties: { include: { service: true } },
        masterLocations: { include: { location: true }, distinct: ["locationId"] },
      },
    }),
    prisma.booking.groupBy({
      by: ["masterId"],
      where: { date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      _count: { _all: true },
    }),
  ]);

  const countByMaster = new Map(counts.map((c) => [c.masterId, c._count._all]));

  return masters.map((m) => ({
    id: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl,
    isActive: m.isActive,
    rating: Number(m.ratingCached),
    specialtyNames: [...new Set(m.specialties.map((s) => s.service.name))],
    locationNames: [...new Set(m.masterLocations.map((ml) => ml.location.name))],
    bookingsThisMonth: countByMaster.get(m.id) ?? 0,
  }));
}

export type AdminMasterDetail = Awaited<ReturnType<typeof getAdminMasterDetail>>;

export async function getAdminMasterDetail(masterId: string) {
  const master = await prisma.master.findUnique({ where: { id: masterId }, include: { user: true } });
  if (!master) throw new MasterNotFoundError();

  const [profile, allLocations, masterLocations] = await Promise.all([
    getMasterProfile(masterId),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.masterLocation.findMany({ where: { masterId } }),
  ]);

  const schedules = allLocations.map((loc) => {
    const rows = masterLocations.filter((ml) => ml.locationId === loc.id);
    const byWeekday = new Map(rows.map((r) => [r.weekday, r]));
    const days: RegularScheduleDay[] = Array.from({ length: 7 }, (_, weekday) => {
      const row = byWeekday.get(weekday);
      return { weekday, isWorking: !!row, timeFrom: row?.timeFrom ?? null, timeTo: row?.timeTo ?? null };
    });
    return { locationId: loc.id, locationName: loc.name, days };
  });

  return {
    ...profile,
    isActive: master.isActive,
    phone: master.user.phone,
    telegramLinked: master.user.telegramId !== null,
    allLocations,
    schedules,
  };
}

// The write shape (undefined for a day off) — distinct from RegularScheduleDay,
// which is the read shape coming back from getRegularSchedule (null for a day
// off, since that's a real DB row's absence, not an unset form field).
export type AdminScheduleDayInput = { weekday: number; isWorking: boolean; timeFrom?: string; timeTo?: string };
export type AdminMasterScheduleInput = { locationId: string; schedule: AdminScheduleDayInput[] };
export type AdminMasterProfileInput = {
  name: string;
  bio?: string;
  instagramUrl?: string;
  avatarUrl?: string;
  specialtyServiceIds: string[];
  schedules: AdminMasterScheduleInput[];
};

export async function createAdminMaster(
  input: AdminMasterProfileInput & { phone: string },
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new InvalidPhoneError();

  let user = await prisma.user.findUnique({ where: { phone } });
  if (user) {
    if (user.role !== "master") throw new MasterPhoneConflictError();
    const existingMaster = await prisma.master.findUnique({ where: { userId: user.id } });
    if (existingMaster) throw new MasterPhoneConflictError();
  } else {
    user = await prisma.user.create({ data: { phone, name: input.name, role: "master" } });
  }

  const slug = await generateUniqueMasterSlug(input.name);
  const master = await prisma.master.create({
    data: {
      userId: user.id,
      slug,
      name: input.name,
      bio: input.bio || null,
      instagramUrl: input.instagramUrl || null,
      avatarUrl: input.avatarUrl || null,
    },
  });

  if (input.specialtyServiceIds.length > 0) {
    await prisma.masterSpecialty.createMany({
      data: input.specialtyServiceIds.map((serviceId) => ({ masterId: master.id, serviceId })),
    });
  }
  for (const s of input.schedules) {
    await updateRegularSchedule(master.id, s.locationId, s.schedule);
  }

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_master_created",
    entityType: "master",
    entityId: master.id,
    newValue: { name: input.name, phone, specialtyServiceIds: input.specialtyServiceIds },
    ip,
    userAgent,
  });

  return master;
}

export async function updateAdminMaster(
  masterId: string,
  input: AdminMasterProfileInput,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const before = await prisma.master.findUnique({ where: { id: masterId }, include: { specialties: true } });
  if (!before) throw new MasterNotFoundError();

  await updateMasterProfile(masterId, input);
  for (const s of input.schedules) {
    await updateRegularSchedule(masterId, s.locationId, s.schedule);
  }

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_master_updated",
    entityType: "master",
    entityId: masterId,
    oldValue: { name: before.name, bio: before.bio, specialtyServiceIds: before.specialties.map((s) => s.serviceId) },
    newValue: { name: input.name, bio: input.bio, specialtyServiceIds: input.specialtyServiceIds },
    ip,
    userAgent,
  });
}

export async function getActiveMasterBookingsCount(masterId: string): Promise<number> {
  const today = getSalonToday();
  return prisma.booking.count({
    where: { masterId, status: { in: ["pending", "confirmed"] }, date: { gte: today } },
  });
}

/** Requires requireRecentReauth() to have been checked by the caller first —
 * this is deliberately not enforced inside the function itself, matching
 * how requireAdmin() is always called explicitly at the top of a route
 * rather than threaded through every lib function it protects. */
export async function deactivateAdminMaster(
  masterId: string,
  options: { cancelActiveBookings: boolean },
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const master = await prisma.master.findUnique({ where: { id: masterId } });
  if (!master) throw new MasterNotFoundError();

  const today = getSalonToday();
  const activeBookings = await prisma.booking.findMany({
    where: { masterId, status: { in: ["pending", "confirmed"] }, date: { gte: today } },
  });

  if (options.cancelActiveBookings) {
    for (const booking of activeBookings) {
      await cancelAdminBooking(booking.id, admin, ip, userAgent);
    }
  }

  await prisma.master.update({ where: { id: masterId }, data: { isActive: false } });
  // A deactivated master shouldn't keep using their still-unexpired session
  // to act as a master — kill every token they currently hold, immediately.
  await blacklistUserJWTs(master.userId);

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_master_deactivated",
    entityType: "master",
    entityId: masterId,
    oldValue: { isActive: true },
    newValue: {
      isActive: false,
      activeBookingsAtDeactivation: activeBookings.length,
      bookingsCancelled: options.cancelActiveBookings,
    },
    ip,
    userAgent,
  });

  return { cancelledCount: options.cancelActiveBookings ? activeBookings.length : 0 };
}

/** Reactivation is the plain undo of a soft-delete — unlike deactivation, it
 * doesn't touch any bookings and doesn't need step-up re-auth. */
export async function reactivateAdminMaster(
  masterId: string,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const master = await prisma.master.findUnique({ where: { id: masterId } });
  if (!master) throw new MasterNotFoundError();

  await prisma.master.update({ where: { id: masterId }, data: { isActive: true } });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_master_reactivated",
    entityType: "master",
    entityId: masterId,
    oldValue: { isActive: false },
    newValue: { isActive: true },
    ip,
    userAgent,
  });
}

// ---------------------------------------------------------------------------
// Services: list, detail, create/update, inline price edit, soft delete
// ---------------------------------------------------------------------------

export class ServiceNotFoundError extends Error {}
export class InvalidPriceRangeError extends Error {}

export type AdminServicesList = Awaited<ReturnType<typeof getAdminServicesList>>;

export async function getAdminServicesList() {
  const services = await prisma.service.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return services.map((s) => ({
    id: s.id,
    category: s.category,
    name: s.name,
    durationMinutes: s.durationMinutes,
    priceFrom: Number(s.priceFrom),
    priceTo: s.priceTo !== null ? Number(s.priceTo) : null,
    isActive: s.isActive,
    seoSlug: s.seoSlug,
  }));
}

export async function getAdminServiceDetail(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new ServiceNotFoundError();
  return {
    id: service.id,
    category: service.category,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    priceFrom: Number(service.priceFrom),
    priceTo: service.priceTo !== null ? Number(service.priceTo) : null,
    photoUrls: service.photoUrls,
    seoSlug: service.seoSlug,
    isActive: service.isActive,
  };
}

/** The list page's inline price edit — deliberately separate from the full
 * update below so a one-field change in a table cell doesn't need the whole
 * edit form's payload (name/category/description/photos unrelated to it). */
export async function updateAdminServicePrice(
  serviceId: string,
  priceFrom: number,
  priceTo: number | null,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const before = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!before) throw new ServiceNotFoundError();
  if (priceTo !== null && priceTo < priceFrom) throw new InvalidPriceRangeError();

  await prisma.service.update({ where: { id: serviceId }, data: { priceFrom, priceTo } });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_service_price_updated",
    entityType: "service",
    entityId: serviceId,
    oldValue: { priceFrom: Number(before.priceFrom), priceTo: before.priceTo !== null ? Number(before.priceTo) : null },
    newValue: { priceFrom, priceTo },
    ip,
    userAgent,
  });
}

export type AdminServiceInput = {
  category: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceFrom: number;
  priceTo?: number;
  photoUrls: string[];
  seoSlug?: string;
};

export async function createAdminService(
  input: AdminServiceInput,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  if (input.priceTo !== undefined && input.priceTo < input.priceFrom) throw new InvalidPriceRangeError();

  const desiredBase = slugify(input.seoSlug?.trim() || input.name);
  const seoSlug = await ensureUniqueSlug(
    desiredBase,
    async (slug) => (await prisma.service.findUnique({ where: { seoSlug: slug } })) !== null,
  );

  const service = await prisma.service.create({
    data: {
      category: input.category,
      name: input.name,
      description: input.description,
      durationMinutes: input.durationMinutes,
      priceFrom: input.priceFrom,
      priceTo: input.priceTo ?? null,
      photoUrls: input.photoUrls,
      seoSlug,
    },
  });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_service_created",
    entityType: "service",
    entityId: service.id,
    newValue: { ...input, seoSlug },
    ip,
    userAgent,
  });

  return service;
}

export async function updateAdminService(
  serviceId: string,
  input: AdminServiceInput,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  if (input.priceTo !== undefined && input.priceTo < input.priceFrom) throw new InvalidPriceRangeError();

  const before = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!before) throw new ServiceNotFoundError();

  const desiredSlug = input.seoSlug?.trim() ? slugify(input.seoSlug) : before.seoSlug;
  const seoSlug =
    desiredSlug === before.seoSlug
      ? before.seoSlug
      : await ensureUniqueSlug(desiredSlug, async (slug) => {
          const existing = await prisma.service.findUnique({ where: { seoSlug: slug } });
          return existing !== null && existing.id !== serviceId;
        });

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      category: input.category,
      name: input.name,
      description: input.description,
      durationMinutes: input.durationMinutes,
      priceFrom: input.priceFrom,
      priceTo: input.priceTo ?? null,
      photoUrls: input.photoUrls,
      seoSlug,
    },
  });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_service_updated",
    entityType: "service",
    entityId: serviceId,
    oldValue: {
      name: before.name,
      category: before.category,
      priceFrom: Number(before.priceFrom),
      priceTo: before.priceTo !== null ? Number(before.priceTo) : null,
      seoSlug: before.seoSlug,
    },
    newValue: { name: input.name, category: input.category, priceFrom: input.priceFrom, priceTo: input.priceTo ?? null, seoSlug },
    ip,
    userAgent,
  });
}

export async function setServiceActive(
  serviceId: string,
  isActive: boolean,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const before = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!before) throw new ServiceNotFoundError();

  await prisma.service.update({ where: { id: serviceId }, data: { isActive } });

  await logAdminAction({
    actorId: admin.adminId,
    action: isActive ? "admin_service_reactivated" : "admin_service_deactivated",
    entityType: "service",
    entityId: serviceId,
    oldValue: { isActive: before.isActive },
    newValue: { isActive },
    ip,
    userAgent,
  });
}

// ---------------------------------------------------------------------------
// Locations: list, detail, create/update, soft delete
// ---------------------------------------------------------------------------

export class LocationNotFoundError extends Error {}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WorkingHoursDay = { isOpen: boolean; from?: string; to?: string };
export type WorkingHours = Record<(typeof DAY_KEYS)[number], WorkingHoursDay>;

/** Existing seed data used a single `{ everyday: "09:00-21:00" }` shape;
 * Stage 5's spec wants real per-day hours. Reading an old-shaped row through
 * this just applies its one range to every day — the next save then
 * persists the real per-day shape, no migration needed. */
function normalizeWorkingHours(raw: unknown): WorkingHours {
  const closedWeek = () => Object.fromEntries(DAY_KEYS.map((k) => [k, { isOpen: false }])) as WorkingHours;

  if (!raw || typeof raw !== "object") return closedWeek();
  const obj = raw as Record<string, unknown>;

  if (typeof obj.everyday === "string") {
    const [from, to] = obj.everyday.split("-");
    const day: WorkingHoursDay = { isOpen: true, from, to };
    return Object.fromEntries(DAY_KEYS.map((k) => [k, day])) as WorkingHours;
  }

  const result = closedWeek();
  for (const key of DAY_KEYS) {
    const day = obj[key] as Partial<WorkingHoursDay> | undefined;
    if (day?.isOpen) result[key] = { isOpen: true, from: day.from, to: day.to };
  }
  return result;
}

export type AdminLocationsList = Awaited<ReturnType<typeof getAdminLocationsList>>;

export async function getAdminLocationsList() {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    phone: l.phone,
    workingHours: normalizeWorkingHours(l.workingHours),
    photoUrls: l.photoUrls,
    isActive: l.isActive,
  }));
}

export async function getAdminLocationDetail(locationId: string) {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw new LocationNotFoundError();
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    phone: location.phone,
    workingHours: normalizeWorkingHours(location.workingHours),
    photoUrls: location.photoUrls,
    isActive: location.isActive,
  };
}

export type AdminLocationInput = {
  name: string;
  address: string;
  phone: string;
  workingHours: WorkingHours;
  photoUrls: string[];
};

export async function createAdminLocation(
  input: AdminLocationInput,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const slug = await ensureUniqueSlug(
    slugify(input.name),
    async (slug) => (await prisma.location.findUnique({ where: { slug } })) !== null,
  );

  const location = await prisma.location.create({
    data: {
      slug,
      name: input.name,
      address: input.address,
      phone: input.phone,
      workingHours: input.workingHours as unknown as Prisma.InputJsonValue,
      photoUrls: input.photoUrls,
    },
  });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_location_created",
    entityType: "location",
    entityId: location.id,
    newValue: { name: input.name, address: input.address, phone: input.phone },
    ip,
    userAgent,
  });

  return location;
}

export async function updateAdminLocation(
  locationId: string,
  input: AdminLocationInput,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const before = await prisma.location.findUnique({ where: { id: locationId } });
  if (!before) throw new LocationNotFoundError();

  await prisma.location.update({
    where: { id: locationId },
    data: {
      name: input.name,
      address: input.address,
      phone: input.phone,
      workingHours: input.workingHours as unknown as Prisma.InputJsonValue,
      photoUrls: input.photoUrls,
    },
  });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_location_updated",
    entityType: "location",
    entityId: locationId,
    oldValue: { name: before.name, address: before.address, phone: before.phone },
    newValue: { name: input.name, address: input.address, phone: input.phone },
    ip,
    userAgent,
  });
}

export async function setLocationActive(
  locationId: string,
  isActive: boolean,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const before = await prisma.location.findUnique({ where: { id: locationId } });
  if (!before) throw new LocationNotFoundError();

  await prisma.location.update({ where: { id: locationId }, data: { isActive } });

  await logAdminAction({
    actorId: admin.adminId,
    action: isActive ? "admin_location_reactivated" : "admin_location_deactivated",
    entityType: "location",
    entityId: locationId,
    oldValue: { isActive: before.isActive },
    newValue: { isActive },
    ip,
    userAgent,
  });
}

// --- Reviews moderation ----------------------------------------------------

export class ReviewNotFoundError extends Error {}

const reviewCardInclude = {
  client: { select: { name: true, phone: true } },
  master: { select: { name: true, slug: true } },
  location: { select: { name: true } },
} satisfies Prisma.ReviewInclude;

function formatReviewCard(review: Prisma.ReviewGetPayload<{ include: typeof reviewCardInclude }>) {
  return {
    id: review.id,
    rating: review.rating,
    text: review.text,
    photoUrls: review.photoUrls,
    createdAt: review.createdAt,
    isPublished: review.isPublished,
    isModerated: review.isModerated,
    rejectionReason: review.rejectionReason,
    clientName: review.client.name ?? review.client.phone,
    masterName: review.master?.name ?? null,
    masterSlug: review.master?.slug ?? null,
    locationName: review.location.name,
  };
}

export type AdminReviewCard = ReturnType<typeof formatReviewCard>;

/** Pending queue — oldest first, so a review doesn't sit forever if new ones
 * keep arriving on top of it. */
export async function getAdminReviewsQueue() {
  const reviews = await prisma.review.findMany({
    where: { isModerated: false },
    include: reviewCardInclude,
    orderBy: { createdAt: "asc" },
  });
  return reviews.map(formatReviewCard);
}

export async function getAdminPublishedReviews() {
  const reviews = await prisma.review.findMany({
    where: { isPublished: true },
    include: reviewCardInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return reviews.map(formatReviewCard);
}

/** Also used to re-publish a review an admin previously unpublished — it
 * doesn't care about the review's current state, only where it ends up. */
export async function publishReview(reviewId: string, admin: AdminContext, ip: string, userAgent: string | null) {
  const before = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!before) throw new ReviewNotFoundError();

  await prisma.review.update({
    where: { id: reviewId },
    data: { isModerated: true, isPublished: true, rejectionReason: null },
  });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_review_published",
    entityType: "review",
    entityId: reviewId,
    oldValue: { isPublished: before.isPublished },
    newValue: { isPublished: true },
    ip,
    userAgent,
  });
}

export async function rejectReview(
  reviewId: string,
  reason: string | undefined,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
) {
  const before = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!before) throw new ReviewNotFoundError();

  await prisma.review.update({
    where: { id: reviewId },
    data: { isModerated: true, isPublished: false, rejectionReason: reason ?? null },
  });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_review_rejected",
    entityType: "review",
    entityId: reviewId,
    oldValue: { isPublished: before.isPublished },
    newValue: { isPublished: false, rejectionReason: reason ?? null },
    ip,
    userAgent,
  });
}

/** Stays moderated — an unpublish is a visibility toggle, not an undo of the
 * original moderation decision, so it doesn't go back into the queue. */
export async function unpublishReview(reviewId: string, admin: AdminContext, ip: string, userAgent: string | null) {
  const before = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!before) throw new ReviewNotFoundError();

  await prisma.review.update({ where: { id: reviewId }, data: { isPublished: false } });

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_review_unpublished",
    entityType: "review",
    entityId: reviewId,
    oldValue: { isPublished: before.isPublished },
    newValue: { isPublished: false },
    ip,
    userAgent,
  });
}

// --- Analytics + xlsx export ------------------------------------------------

export class InvalidDateRangeError extends Error {}

const MAX_REPORT_RANGE_DAYS = 365;

/** `to` is inclusive, so a same-day range has a diff of 0 — this only rejects
 * a range that spans MORE than 365 distinct days. */
function validateDateRange(from: Date, to: Date): void {
  if (from > to) throw new InvalidDateRangeError();
  if (differenceInCalendarDays(to, from) > MAX_REPORT_RANGE_DAYS) throw new InvalidDateRangeError();
}

/** `from`/`to` are UTC-midnight Dates (via parseDateOnly) — this must stay
 * pure UTC arithmetic. date-fns' eachDayOfInterval walks LOCAL calendar
 * days, which on a server running outside UTC (e.g. Europe/Kyiv, +2/+3)
 * silently shifts every key back a day and drops the range's last day. */
function utcDayKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    keys.push(formatDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export type AdminAnalytics = Awaited<ReturnType<typeof getAdminAnalytics>>;

/**
 * Everything the /admin/analytics charts need, in one query: per-day booking
 * count + revenue (for the two line charts), top 10 masters/services by
 * booking count (bar charts), and a created/completed/cancelled funnel.
 *
 * Revenue has no stored snapshot on Booking (payment integration is out of
 * MVP scope, see the Transaction model's comment) — it's derived from the
 * linked service's current `priceFrom`, counted only for `completed`
 * bookings. If a service's price changes later, past revenue here shifts
 * with it; that's an accepted simplification until real payment records
 * exist.
 */
export async function getAdminAnalytics(fromStr: string, toStr: string) {
  const from = parseDateOnly(fromStr);
  const to = parseDateOnly(toStr);
  validateDateRange(from, to);

  const bookings = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to } },
    select: {
      date: true,
      status: true,
      masterId: true,
      serviceId: true,
      master: { select: { name: true } },
      service: { select: { name: true, priceFrom: true } },
    },
  });

  const dayKeys = utcDayKeys(from, to);
  const bookingsByDay = new Map<string, number>(dayKeys.map((d) => [d, 0]));
  const revenueByDay = new Map<string, number>(dayKeys.map((d) => [d, 0]));
  const masterCounts = new Map<string, { name: string; count: number }>();
  const serviceCounts = new Map<string, { name: string; count: number }>();
  const funnel = { created: 0, completed: 0, cancelled: 0 };

  for (const b of bookings) {
    const dayKey = formatDateOnly(b.date);
    bookingsByDay.set(dayKey, (bookingsByDay.get(dayKey) ?? 0) + 1);

    funnel.created += 1;
    if (b.status === "completed") {
      funnel.completed += 1;
      revenueByDay.set(dayKey, (revenueByDay.get(dayKey) ?? 0) + Number(b.service.priceFrom));
    } else if (b.status === "cancelled" || b.status === "no_show") {
      funnel.cancelled += 1;
    }

    const masterEntry = masterCounts.get(b.masterId) ?? { name: b.master.name, count: 0 };
    masterEntry.count += 1;
    masterCounts.set(b.masterId, masterEntry);

    const serviceEntry = serviceCounts.get(b.serviceId) ?? { name: b.service.name, count: 0 };
    serviceEntry.count += 1;
    serviceCounts.set(b.serviceId, serviceEntry);
  }

  const topByCount = (m: Map<string, { name: string; count: number }>) =>
    Array.from(m.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  return {
    days: dayKeys.map((date) => ({
      date,
      bookings: bookingsByDay.get(date) ?? 0,
      revenue: revenueByDay.get(date) ?? 0,
    })),
    topMasters: topByCount(masterCounts),
    topServices: topByCount(serviceCounts),
    funnel,
  };
}

export type AdminReportFilters = {
  from: string;
  to: string;
  masterId?: string;
  locationId?: string;
  status?: BookingStatus;
};

/**
 * Generates the xlsx buffer and logs the export in one call — export is a
 * read-only action but still audit-worthy (who pulled client/booking data,
 * for what range) per the pentest-readiness requirement.
 */
export async function generateAdminReportXlsx(
  filters: AdminReportFilters,
  admin: AdminContext,
  ip: string,
  userAgent: string | null,
): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
  const from = parseDateOnly(filters.from);
  const to = parseDateOnly(filters.to);
  validateDateRange(from, to);

  const bookings = await prisma.booking.findMany({
    where: {
      date: { gte: from, lte: to },
      masterId: filters.masterId || undefined,
      locationId: filters.locationId || undefined,
      status: filters.status || undefined,
    },
    include: { client: true, master: true, service: true, location: true },
    orderBy: { date: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Visavis admin";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Звіт");
  sheet.columns = [
    { header: "Дата", key: "date", width: 12 },
    { header: "Час", key: "time", width: 14 },
    { header: "Клієнт", key: "client", width: 24 },
    { header: "Телефон", key: "phone", width: 16 },
    { header: "Майстер", key: "master", width: 24 },
    { header: "Послуга", key: "service", width: 28 },
    { header: "Категорія", key: "category", width: 16 },
    { header: "Філія", key: "location", width: 24 },
    { header: "Статус", key: "status", width: 16 },
    { header: "Джерело", key: "source", width: 10 },
    { header: "Ціна, грн", key: "price", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  let totalRevenue = 0;
  for (const b of bookings) {
    const price = Number(b.service.priceFrom);
    if (b.status === "completed") totalRevenue += price;

    sheet.addRow({
      date: formatDateOnly(b.date),
      time: `${b.timeFrom}–${b.timeTo}`,
      client: b.client.name ?? b.client.phone,
      phone: b.client.phone,
      master: b.master.name,
      service: b.service.name,
      category: b.service.category,
      location: b.location.name,
      status: STATUS_LABELS[b.status] ?? b.status,
      source: b.createdVia === "bot" ? "Бот" : "Сайт",
      price,
    });
  }

  sheet.addRow({});
  const totalRow = sheet.addRow({
    date: "Разом",
    client: `${bookings.length} записів`,
    status: "Виручка (виконані):",
    price: totalRevenue,
  });
  totalRow.font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();

  await logAdminAction({
    actorId: admin.adminId,
    action: "admin_report_exported",
    entityType: "report",
    entityId: "bookings",
    metadata: {
      from: filters.from,
      to: filters.to,
      masterId: filters.masterId ?? null,
      locationId: filters.locationId ?? null,
      status: filters.status ?? null,
      rowCount: bookings.length,
    },
    ip,
    userAgent,
  });

  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `visavis-zvit-${filters.from}_${filters.to}.xlsx`,
    rowCount: bookings.length,
  };
}

// --- Audit log (read-only) --------------------------------------------------

const ADMIN_AUDIT_PAGE_SIZE = 100;

export type AdminAuditFilters = {
  actorId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
};

export type AdminAuditList = Awaited<ReturnType<typeof getAdminAuditLog>>;

/**
 * Deliberately the only function in this file that reads AdminAuditLog and
 * does NOT also write to it — viewing the log must never itself produce a
 * new entry, or every page of the log would grow the log. There is also no
 * update/delete counterpart anywhere in the codebase for this table (see
 * the model comment in schema.prisma) — this file has no
 * deleteAdminAuditLog / updateAdminAuditLog export, and never will.
 */
export async function getAdminAuditLog(filters: AdminAuditFilters) {
  const where: Prisma.AdminAuditLogWhereInput = {
    actorId: filters.actorId || undefined,
    action: filters.action || undefined,
    createdAt: {
      gte: filters.dateFrom ? parseDateOnly(filters.dateFrom) : undefined,
      // dateTo is a calendar day picked in a date input, but createdAt has a
      // time component — "up to and including that day" means strictly
      // before the NEXT day, not <= its own midnight.
      lt: filters.dateTo ? addDays(parseDateOnly(filters.dateTo), 1) : undefined,
    },
  };

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * ADMIN_AUDIT_PAGE_SIZE,
      take: ADMIN_AUDIT_PAGE_SIZE,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, phone: true } })
    : [];
  const actorNames = new Map(actors.map((a) => [a.id, a.name ?? a.phone]));

  return {
    entries: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      actorId: r.actorId,
      actorName: actorNames.get(r.actorId) ?? "Видалений користувач",
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      oldValue: r.oldValue,
      newValue: r.newValue,
      metadata: r.metadata,
      ip: r.ip,
      userAgent: r.userAgent,
    })),
    total,
    page: filters.page,
    pageSize: ADMIN_AUDIT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_AUDIT_PAGE_SIZE)),
  };
}

export type AdminAuditFilterOptions = Awaited<ReturnType<typeof getAdminAuditFilterOptions>>;

/** Options come from the log itself (distinct actorId/action ever recorded),
 * not from the current admins table — a demoted or deactivated admin's past
 * actions must stay filterable by name. */
export async function getAdminAuditFilterOptions() {
  const [actionRows, actorRows] = await Promise.all([
    prisma.adminAuditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.adminAuditLog.findMany({ distinct: ["actorId"], select: { actorId: true } }),
  ]);

  const actorIds = actorRows.map((a) => a.actorId);
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      })
    : [];

  return {
    actions: actionRows.map((a) => a.action),
    actors: actors.map((a) => ({ id: a.id, name: a.name ?? a.phone })),
  };
}
