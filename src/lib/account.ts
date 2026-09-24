import { differenceInCalendarMonths } from "date-fns";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { formatDateOnly } from "@/lib/booking";
import { visitStartsAt } from "@/lib/reminders";
import { getSalonToday } from "@/lib/timezone";

export const MIN_HOURS_BEFORE_CANCEL = 2;
const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];
const RECENT_VISITS_LIMIT = 3;
export const ACCOUNT_BOOKINGS_PAGE_SIZE = 10;

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

// ---------------------------------------------------------------------------
// Bookings: list (tabbed) + detail
// ---------------------------------------------------------------------------

export type AccountBookingsTab = "upcoming" | "past";

export type AccountBookingsList = Awaited<ReturnType<typeof getBookingsList>>;

export async function getBookingsList({
  clientId,
  tab,
  page,
}: {
  clientId: string;
  tab: AccountBookingsTab;
  page: number;
}) {
  const today = getSalonToday();
  const where: Prisma.BookingWhereInput =
    tab === "upcoming"
      ? { clientId, status: { in: ACTIVE_STATUSES }, date: { gte: today } }
      : { clientId, OR: [{ date: { lt: today } }, { status: { notIn: ACTIVE_STATUSES } }] };
  const orderBy: Prisma.BookingOrderByWithRelationInput[] =
    tab === "upcoming" ? [{ date: "asc" }, { timeFrom: "asc" }] : [{ date: "desc" }, { timeFrom: "desc" }];

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { service: true, master: true, review: true },
      orderBy,
      skip: (page - 1) * ACCOUNT_BOOKINGS_PAGE_SIZE,
      take: ACCOUNT_BOOKINGS_PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      date: formatDateOnly(b.date),
      timeFrom: b.timeFrom,
      status: b.status,
      serviceName: b.service.name,
      master: { id: b.masterId, name: b.master.name, avatarUrl: b.master.avatarUrl },
      hasReview: b.review !== null,
    })),
    total,
    page,
    pageSize: ACCOUNT_BOOKINGS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / ACCOUNT_BOOKINGS_PAGE_SIZE)),
  };
}

/** IDOR guard: a booking a client can view/act on must be theirs. */
export async function getOwnedAccountBooking(clientId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, master: true, location: true, review: true },
  });
  if (!booking || booking.clientId !== clientId) return null;
  return booking;
}

export type AccountBookingDetail = Awaited<ReturnType<typeof getBookingDetail>>;

export async function getBookingDetail(clientId: string, bookingId: string) {
  const booking = await getOwnedAccountBooking(clientId, bookingId);
  if (!booking) return null;

  const hoursUntilVisit =
    (visitStartsAt(booking.date, booking.timeFrom).getTime() - Date.now()) / (1000 * 60 * 60);

  return {
    id: booking.id,
    date: formatDateOnly(booking.date),
    timeFrom: booking.timeFrom,
    status: booking.status,
    comment: booking.comment,
    serviceId: booking.serviceId,
    serviceName: booking.service.name,
    durationMinutes: booking.service.durationMinutes,
    master: { id: booking.masterId, name: booking.master.name, avatarUrl: booking.master.avatarUrl },
    locationAddress: booking.location.address,
    hasReview: booking.review !== null,
    canCancel:
      ACTIVE_STATUSES.includes(booking.status) && hoursUntilVisit > MIN_HOURS_BEFORE_CANCEL,
  };
}
