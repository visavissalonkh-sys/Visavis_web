import { addDays, endOfWeek, startOfWeek } from "date-fns";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { formatDateOnly } from "@/lib/booking";
import { getSalonToday } from "@/lib/timezone";

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
