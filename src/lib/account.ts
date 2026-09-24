import { differenceInCalendarMonths } from "date-fns";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { formatDateOnly } from "@/lib/booking";
import { visitStartsAt } from "@/lib/reminders";
import { getSalonToday } from "@/lib/timezone";

export const MIN_HOURS_BEFORE_CANCEL = 2;
const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];
const RECENT_VISITS_LIMIT = 3;

/** The signed-in user's own row — every /account/* page and API route reads through this. */
export async function getAccountUser(session: SessionPayload) {
  return prisma.user.findUnique({ where: { id: session.sub } });
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(user: {
  id: string;
  name: string | null;
  createdAt: Date;
  telegramId: bigint | null;
}) {
  const today = getSalonToday();

  const [nextBooking, recentVisits, completedCount] = await Promise.all([
    prisma.booking.findFirst({
      where: { clientId: user.id, status: { in: ACTIVE_STATUSES }, date: { gte: today } },
      include: { service: true, master: true, location: true },
      orderBy: [{ date: "asc" }, { timeFrom: "asc" }],
    }),
    prisma.booking.findMany({
      where: { clientId: user.id, OR: [{ date: { lt: today } }, { status: { notIn: ACTIVE_STATUSES } }] },
      include: { service: true, master: true, review: true },
      orderBy: [{ date: "desc" }, { timeFrom: "desc" }],
      take: RECENT_VISITS_LIMIT,
    }),
    prisma.booking.count({ where: { clientId: user.id, status: "completed" } }),
  ]);

  return {
    firstName: (user.name ?? "").split(" ")[0] || null,
    memberSinceMonths: Math.max(0, differenceInCalendarMonths(new Date(), user.createdAt)),
    completedVisits: completedCount,
    telegramLinked: user.telegramId !== null,
    nextBooking: nextBooking
      ? {
          id: nextBooking.id,
          date: formatDateOnly(nextBooking.date),
          timeFrom: nextBooking.timeFrom,
          serviceId: nextBooking.serviceId,
          serviceName: nextBooking.service.name,
          master: { id: nextBooking.masterId, name: nextBooking.master.name, avatarUrl: nextBooking.master.avatarUrl },
          locationAddress: nextBooking.location.address,
          visitAtIso: visitStartsAt(nextBooking.date, nextBooking.timeFrom).toISOString(),
        }
      : null,
    recentVisits: recentVisits.map((b) => ({
      id: b.id,
      date: formatDateOnly(b.date),
      timeFrom: b.timeFrom,
      serviceName: b.service.name,
      masterName: b.master.name,
      status: b.status,
      hasReview: b.review !== null,
    })),
  };
}
