import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { formatBookingDateTimeUk, parseDateOnly } from "@/lib/booking";
import { cancelReminders, visitStartsAt } from "@/lib/reminders";
import { sendTelegramMessage } from "@/lib/notifications";
import { logAuthEvent } from "@/lib/audit-log";

const MIN_HOURS_BEFORE_CANCEL = 2;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/booking/[id]/cancel">) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = await rateLimit(`booking:cancel:user:${session.sub}`, 20, 600);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true, master: { include: { user: true } }, location: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // IDOR guard — only the owning client or an admin may cancel via this route.
  const isOwner = booking.clientId === session.sub;
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "already_cancelled", message: "Запис вже скасовано." }, { status: 400 });
  }
  if (booking.status === "completed") {
    return NextResponse.json({ error: "already_completed", message: "Цей візит уже відбувся." }, { status: 400 });
  }

  const visitAt = visitStartsAt(booking.date, booking.timeFrom);
  const hoursUntilVisit = (visitAt.getTime() - Date.now()) / (1000 * 60 * 60);

  if (!isAdmin && hoursUntilVisit < MIN_HOURS_BEFORE_CANCEL) {
    return NextResponse.json(
      { error: "too_late", message: "Скасування можливе не пізніше ніж за 2 години до візиту." },
      { status: 400 },
    );
  }

  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
  await cancelReminders(booking.id);

  logAuthEvent({ action: "booking_cancelled", ip, phone: session.phone, bookingId: booking.id });

  const whenText = formatBookingDateTimeUk(parseDateOnly(booking.date.toISOString().slice(0, 10)), booking.timeFrom);

  if (booking.master.user.telegramId) {
    sendTelegramMessage(
      booking.master.user.telegramId.toString(),
      `❌ <b>Запис скасовано</b>\n\n${booking.service.name}, ${whenText}\n${booking.location.address}`,
    ).catch((error) => console.error("Failed to notify master of cancellation", error));
  }

  const client = await prisma.user.findUnique({ where: { id: booking.clientId } });
  if (client?.telegramId) {
    sendTelegramMessage(
      client.telegramId.toString(),
      `Ваш запис на ${whenText} скасовано ✅`,
    ).catch((error) => console.error("Failed to notify client of cancellation", error));
  }

  return NextResponse.json({ success: true });
}
