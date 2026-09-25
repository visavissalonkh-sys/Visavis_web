import { addDays, endOfWeek, startOfWeek } from "date-fns";
import type { AvailabilityOverrideType, BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import {
  formatDateOnly,
  minutesToTime,
  parseDateOnly,
  subtractRange,
  timeToMinutes,
  type Range,
} from "@/lib/booking";
import { getSalonToday } from "@/lib/timezone";
import { notifyAdmins } from "@/lib/alerts";

/** Resolves the Master row owned by this session, or null if the user isn't a master (yet). */
export async function getMasterForSession(session: SessionPayload) {
  return prisma.master.findFirst({ where: { userId: session.sub } });
}

/** IDOR guard: a booking a master can act on must be theirs — never trust the URL id alone. */
export async function getOwnedBooking(masterId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, location: true, client: true, master: true },
  });
  if (!booking || booking.masterId !== masterId) return null;
  return booking;
}

export async function logMasterAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    },
  });
}

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(masterId: string, masterName: string) {
  const today = getSalonToday();
  const weekEnd = addDays(today, 7);
  const statsFrom = startOfWeek(today, { weekStartsOn: 1 });
  const statsTo = endOfWeek(today, { weekStartsOn: 1 });

  const [todayBookings, upcomingBookings, weekBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { masterId, date: today, status: { in: ACTIVE_STATUSES } },
      include: { service: true, location: true, client: true },
      orderBy: { timeFrom: "asc" },
    }),
    prisma.booking.findMany({
      where: { masterId, date: { gt: today, lt: weekEnd }, status: { in: ACTIVE_STATUSES } },
      include: { service: true },
      orderBy: [{ date: "asc" }, { timeFrom: "asc" }],
    }),
    prisma.booking.findMany({
      where: { masterId, date: { gte: statsFrom, lte: statsTo } },
      include: { service: true },
    }),
  ]);

  const upcomingByDay = new Map<string, number>();
  for (const booking of upcomingBookings) {
    const key = formatDateOnly(booking.date);
    upcomingByDay.set(key, (upcomingByDay.get(key) ?? 0) + 1);
  }

  const serviceCounts = new Map<string, number>();
  let completed = 0;
  let cancelled = 0;
  for (const booking of weekBookings) {
    if (booking.status === "completed") completed++;
    if (booking.status === "cancelled") cancelled++;
    if (booking.status !== "cancelled") {
      serviceCounts.set(booking.service.name, (serviceCounts.get(booking.service.name) ?? 0) + 1);
    }
  }
  const topService = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    master: { id: masterId, name: masterName },
    today: {
      date: formatDateOnly(today),
      bookings: todayBookings.map((b) => ({
        id: b.id,
        timeFrom: b.timeFrom,
        timeTo: b.timeTo,
        status: b.status,
        serviceName: b.service.name,
        locationName: b.location.name,
        clientName: b.client.name,
        clientPhone: b.client.phone,
      })),
    },
    upcoming: [...upcomingByDay.entries()].map(([date, count]) => ({ date, count })),
    weekStats: {
      total: weekBookings.filter((b) => b.status !== "cancelled").length,
      completed,
      cancelled,
      topService: topService ? { name: topService[0], count: topService[1] } : null,
    },
  };
}

const ALL_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];
export const BOOKINGS_PAGE_SIZE = 20;

export async function getBookingsList({
  masterId,
  status,
  date,
  page,
}: {
  masterId: string;
  status?: BookingStatus;
  date?: string;
  page: number;
}) {
  const where: Prisma.BookingWhereInput = {
    masterId,
    status: status && ALL_STATUSES.includes(status) ? status : undefined,
    date: date ? new Date(`${date}T00:00:00.000Z`) : undefined,
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { service: true, location: true, client: true },
      orderBy: [{ date: "desc" }, { timeFrom: "desc" }],
      skip: (page - 1) * BOOKINGS_PAGE_SIZE,
      take: BOOKINGS_PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      date: formatDateOnly(b.date),
      timeFrom: b.timeFrom,
      timeTo: b.timeTo,
      status: b.status,
      serviceName: b.service.name,
      locationName: b.location.name,
      clientName: b.client.name,
      clientPhone: b.client.phone,
    })),
    total,
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE)),
  };
}

const STATUS_HISTORY_ACTIONS: Record<string, string> = {
  booking_confirmed: "confirmed",
  booking_rejected: "cancelled",
  booking_completed: "completed",
};

export async function getBookingDetail(masterId: string, bookingId: string) {
  const booking = await getOwnedBooking(masterId, bookingId);
  if (!booking) return null;

  const [auditEntries, clientBookings] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: { entityType: "booking", entityId: bookingId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { clientId: booking.clientId, masterId, id: { not: bookingId } },
      include: { service: true },
      orderBy: [{ date: "desc" }, { timeFrom: "desc" }],
      take: 5,
    }),
  ]);

  const statusHistory = [
    { status: "pending", at: booking.createdAt.toISOString() },
    ...auditEntries
      .filter((entry) => entry.action in STATUS_HISTORY_ACTIONS)
      .map((entry) => ({ status: STATUS_HISTORY_ACTIONS[entry.action], at: entry.createdAt.toISOString() })),
  ];

  const totalVisits = await prisma.booking.count({
    where: { clientId: booking.clientId, masterId, status: "completed" },
  });

  return {
    booking: {
      id: booking.id,
      date: formatDateOnly(booking.date),
      timeFrom: booking.timeFrom,
      timeTo: booking.timeTo,
      status: booking.status,
      comment: booking.comment,
      serviceName: booking.service.name,
      durationMinutes: booking.service.durationMinutes,
      locationName: booking.location.name,
      locationAddress: booking.location.address,
    },
    client: {
      id: booking.client.id,
      name: booking.client.name,
      phone: booking.client.phone,
      totalVisits,
      recentVisits: clientBookings.map((b) => ({
        date: formatDateOnly(b.date),
        serviceName: b.service.name,
        status: b.status,
        comment: b.comment,
      })),
    },
    statusHistory,
  };
}

// ---------------------------------------------------------------------------
// Availability: recurring weekly schedule + one-off overrides
// ---------------------------------------------------------------------------

/**
 * All salon locations a master can set a schedule at. There's no separate
 * "assigned locations" concept in the schema — a MasterLocation row *is* the
 * assignment — so this intentionally returns every active location rather
 * than only ones the master already has a schedule for, otherwise a master
 * with no schedule yet would have nowhere to start one.
 */
export async function getAllActiveLocations() {
  return prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

/** Locations a master currently has at least one working day at. */
export async function getMasterWorkingLocations(masterId: string) {
  const links = await prisma.masterLocation.findMany({
    where: { masterId },
    distinct: ["locationId"],
    include: { location: true },
  });
  return links.map((l) => l.location).sort((a, b) => a.name.localeCompare(b.name));
}

export type RegularScheduleDay = {
  weekday: number;
  isWorking: boolean;
  timeFrom: string | null;
  timeTo: string | null;
};

export async function getRegularSchedule(masterId: string, locationId: string): Promise<RegularScheduleDay[]> {
  const rows = await prisma.masterLocation.findMany({ where: { masterId, locationId } });
  const byWeekday = new Map(rows.map((r) => [r.weekday, r]));

  return Array.from({ length: 7 }, (_, weekday) => {
    const row = byWeekday.get(weekday);
    return {
      weekday,
      isWorking: !!row,
      timeFrom: row?.timeFrom ?? null,
      timeTo: row?.timeTo ?? null,
    };
  });
}

export class InvalidScheduleError extends Error {}

export async function updateRegularSchedule(
  masterId: string,
  locationId: string,
  schedule: { weekday: number; isWorking: boolean; timeFrom?: string; timeTo?: string }[],
): Promise<void> {
  for (const day of schedule) {
    if (day.isWorking) {
      if (!day.timeFrom || !day.timeTo || day.timeFrom >= day.timeTo) {
        throw new InvalidScheduleError(`Некоректний час для дня ${day.weekday}`);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const day of schedule) {
      if (day.isWorking) {
        await tx.masterLocation.upsert({
          where: { masterId_locationId_weekday: { masterId, locationId, weekday: day.weekday } },
          update: { timeFrom: day.timeFrom!, timeTo: day.timeTo! },
          create: { masterId, locationId, weekday: day.weekday, timeFrom: day.timeFrom!, timeTo: day.timeTo! },
        });
      } else {
        await tx.masterLocation.deleteMany({ where: { masterId, locationId, weekday: day.weekday } });
      }
    }
  });
}

export async function getOverrides(masterId: string) {
  const today = getSalonToday();
  const overrides = await prisma.masterAvailabilityOverride.findMany({
    where: { masterId, date: { gte: today } },
    orderBy: { date: "asc" },
  });

  return overrides.map((o) => ({
    id: o.id,
    date: formatDateOnly(o.date),
    type: o.type,
    timeFrom: o.timeFrom,
    timeTo: o.timeTo,
    note: o.note,
  }));
}

export class OverrideConflictError extends Error {}
export class PastDateError extends Error {}

export async function createOverride(
  masterId: string,
  input: { date: string; type: AvailabilityOverrideType; timeFrom?: string; timeTo?: string; note?: string },
) {
  const date = parseDateOnly(input.date);
  const today = getSalonToday();
  if (date < today) {
    throw new PastDateError();
  }

  if ((input.type === "extra_slot" || input.type === "blocked_range") && (!input.timeFrom || !input.timeTo || input.timeFrom >= input.timeTo)) {
    throw new InvalidScheduleError("Потрібен коректний проміжок часу");
  }

  const existing = await prisma.masterAvailabilityOverride.findMany({ where: { masterId, date } });

  const wouldConflict =
    input.type === "day_off"
      ? existing.length > 0
      : existing.some((e) => {
          if (e.type === "day_off") return true;
          if (e.type !== input.type || !e.timeFrom || !e.timeTo || !input.timeFrom || !input.timeTo) return false;
          return input.timeFrom < e.timeTo && input.timeTo > e.timeFrom;
        });

  if (wouldConflict) {
    throw new OverrideConflictError();
  }

  const override = await prisma.masterAvailabilityOverride.create({
    data: {
      masterId,
      date,
      type: input.type,
      timeFrom: input.timeFrom,
      timeTo: input.timeTo,
      note: input.note,
      createdBy: "master",
    },
  });

  if (input.type === "day_off") {
    const conflicting = await prisma.booking.findMany({
      where: { masterId, date, status: { in: ["pending", "confirmed"] } },
      include: { client: true, service: true },
      orderBy: { timeFrom: "asc" },
    });
    if (conflicting.length > 0) {
      const master = await prisma.master.findUnique({ where: { id: masterId } });
      notifyAdmins(
        [
          "⚠️ <b>Можливий конфлікт: вихідний майстра</b>",
          "",
          `Майстер: ${master?.name ?? masterId}`,
          `Дата: ${formatDateOnly(date)}`,
          "",
          `Наявні записи на цю дату (${conflicting.length}):`,
          ...conflicting.map(
            (b) => `• о ${b.timeFrom} — ${b.client.name ?? b.client.phone}, ${b.service.name}`,
          ),
        ].join("\n"),
      ).catch((error) => console.error("Failed to notify admins of day-off conflict", error));
    }
  }

  return override;
}

export async function deleteOverride(masterId: string, overrideId: string): Promise<boolean> {
  const override = await prisma.masterAvailabilityOverride.findUnique({ where: { id: overrideId } });
  if (!override || override.masterId !== masterId) return false;
  await prisma.masterAvailabilityOverride.delete({ where: { id: overrideId } });
  return true;
}

// ---------------------------------------------------------------------------
// Weekly schedule grid (/master/schedule)
// ---------------------------------------------------------------------------

const SCHEDULE_DISPLAY_START = timeToMinutes("08:00");
const SCHEDULE_DISPLAY_END = timeToMinutes("22:00");
const SCHEDULE_SLOT_MINUTES = 30;

export type ScheduleSlotStatus = "booked" | "available" | "blocked" | "off";
export type ScheduleSlot = {
  time: string;
  status: ScheduleSlotStatus;
  booking?: { id: string; serviceName: string; clientName: string | null };
};
export type ScheduleDay = { date: string; weekday: number; slots: ScheduleSlot[] };

function inRanges(t: number, ranges: Range[]): boolean {
  return ranges.some(([start, end]) => t >= start && t < end);
}

export async function getWeekSchedule(
  masterId: string,
  locationId: string,
  weekStart: Date,
): Promise<ScheduleDay[]> {
  const weekEndExclusive = addDays(weekStart, 7);

  const [masterLocations, overrides, bookings] = await Promise.all([
    prisma.masterLocation.findMany({ where: { masterId, locationId } }),
    prisma.masterAvailabilityOverride.findMany({
      where: { masterId, date: { gte: weekStart, lt: weekEndExclusive } },
    }),
    prisma.booking.findMany({
      where: {
        masterId,
        locationId,
        date: { gte: weekStart, lt: weekEndExclusive },
        status: { in: ["pending", "confirmed", "completed"] },
      },
      include: { service: true, client: true },
    }),
  ]);

  const scheduleByWeekday = new Map(masterLocations.map((m) => [m.weekday, m]));
  const overrideByDate = new Map(overrides.map((o) => [formatDateOnly(o.date), o]));
  const bookingsByDate = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = formatDateOnly(b.date);
    bookingsByDate.set(key, [...(bookingsByDate.get(key) ?? []), b]);
  }

  const days: ScheduleDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateKey = formatDateOnly(date);
    const weekday = date.getUTCDay();

    const baseRow = scheduleByWeekday.get(weekday);
    const override = overrideByDate.get(dateKey);

    const baseRange: Range | null = baseRow ? [timeToMinutes(baseRow.timeFrom), timeToMinutes(baseRow.timeTo)] : null;
    const extraRange: Range | null =
      override?.type === "extra_slot" && override.timeFrom && override.timeTo
        ? [timeToMinutes(override.timeFrom), timeToMinutes(override.timeTo)]
        : null;

    const wouldHaveWorked: Range[] = [baseRange, extraRange].filter((r): r is Range => r !== null);

    let effectiveWorking: Range[];
    if (override?.type === "day_off") {
      effectiveWorking = [];
    } else if (override?.type === "blocked_range" && override.timeFrom && override.timeTo) {
      effectiveWorking = subtractRange(wouldHaveWorked, [
        timeToMinutes(override.timeFrom),
        timeToMinutes(override.timeTo),
      ]);
    } else {
      effectiveWorking = wouldHaveWorked;
    }

    const dayBookings = bookingsByDate.get(dateKey) ?? [];

    const slots: ScheduleSlot[] = [];
    for (let t = SCHEDULE_DISPLAY_START; t <= SCHEDULE_DISPLAY_END; t += SCHEDULE_SLOT_MINUTES) {
      const booking = dayBookings.find(
        (b) => t >= timeToMinutes(b.timeFrom) && t < timeToMinutes(b.timeTo),
      );

      if (booking) {
        slots.push({
          time: minutesToTime(t),
          status: "booked",
          booking: { id: booking.id, serviceName: booking.service.name, clientName: booking.client.name },
        });
      } else if (inRanges(t, effectiveWorking)) {
        slots.push({ time: minutesToTime(t), status: "available" });
      } else if (inRanges(t, wouldHaveWorked)) {
        slots.push({ time: minutesToTime(t), status: "blocked" });
      } else {
        slots.push({ time: minutesToTime(t), status: "off" });
      }
    }

    days.push({ date: dateKey, weekday, slots });
  }

  return days;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getMasterProfile(masterId: string) {
  const [master, allServices, specialties] = await Promise.all([
    prisma.master.findUniqueOrThrow({ where: { id: masterId } }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.masterSpecialty.findMany({ where: { masterId } }),
  ]);

  const specialtyServiceIds = new Set(specialties.map((s) => s.serviceId));

  return {
    master: {
      slug: master.slug,
      name: master.name,
      bio: master.bio,
      avatarUrl: master.avatarUrl,
      instagramUrl: master.instagramUrl,
      rating: Number(master.ratingCached),
    },
    services: allServices.map((s) => ({ id: s.id, category: s.category, name: s.name })),
    specialtyServiceIds: [...specialtyServiceIds],
  };
}

export async function updateMasterProfile(
  masterId: string,
  input: { name: string; bio?: string; instagramUrl?: string; avatarUrl?: string; specialtyServiceIds: string[] },
): Promise<void> {
  await prisma.$transaction([
    prisma.master.update({
      where: { id: masterId },
      data: {
        name: input.name,
        bio: input.bio || null,
        instagramUrl: input.instagramUrl || null,
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      },
    }),
    prisma.masterSpecialty.deleteMany({ where: { masterId } }),
    ...(input.specialtyServiceIds.length > 0
      ? [
          prisma.masterSpecialty.createMany({
            data: input.specialtyServiceIds.map((serviceId) => ({ masterId, serviceId })),
          }),
        ]
      : []),
  ]);
}
