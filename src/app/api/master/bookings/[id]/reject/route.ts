import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getMasterForSession, getOwnedBooking, logMasterAudit } from "@/lib/master";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { sendTelegramMessage } from "@/lib/notifications";
import { formatBookingDateTimeUk } from "@/lib/booking";
import { cancelReminders } from "@/lib/reminders";
import { queueSheetsSync } from "@/lib/sheets";
import { isValidUuid } from "@/lib/validation/common";

const rejectSchema = z.object({ reason: z.string().trim().max(300).optional() });

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/master/bookings/[id]/reject">) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const limit = await rateLimit(`master:actions:${master.id}`, 30, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато дій. Спробуйте за хвилину." }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний ідентифікатор" }, { status: 400 });
  }
  const booking = await getOwnedBooking(master.id, id);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (booking.status === "cancelled" || booking.status === "completed") {
    return NextResponse.json({ error: "invalid_status", message: "Цей запис вже неактивний." }, { status: 400 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = rejectSchema.safeParse(json);
  const reason = parsed.success ? parsed.data.reason : undefined;

  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
  await cancelReminders(id);
  await queueSheetsSync(id, "cancelled");
  await logMasterAudit({
    actorId: session.sub,
    action: "booking_rejected",
    entityType: "booking",
    entityId: id,
    metadata: reason ? { reason } : undefined,
  });

  if (booking.client?.telegramId) {
    const whenText = formatBookingDateTimeUk(booking.date, booking.timeFrom);
    const reasonLine = reason ? `\nПричина: ${reason}` : "";
    sendTelegramMessage(
      booking.client.telegramId.toString(),
      `❌ <b>Запис скасовано майстром</b>\n\n${booking.service.name}, ${whenText}${reasonLine}\n\nБудь ласка, оберіть інший час на сайті.`,
    ).catch((error) => console.error("Failed to notify client of rejection", error));
  }

  return NextResponse.json({ success: true });
}
