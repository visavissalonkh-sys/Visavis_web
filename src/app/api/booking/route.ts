import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/csrf";
import { getClientIp } from "@/lib/request-ip";
import { createBookingSchema } from "@/lib/validation/booking";
import {
  CriticalSectionBusyError,
  SlotUnavailableError,
  addMinutesToTime,
  formatBookingDateTimeUk,
  getAvailableSlots,
  lockKey,
  parseDateOnly,
  withMasterDayLock,
} from "@/lib/booking";
import { scheduleReminders, visitStartsAt } from "@/lib/reminders";
import { sendTelegramMessage } from "@/lib/notifications";
import { logAuthEvent } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`booking:create:user:${session.sub}`, 10, 600);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні дані запису" }, { status: 400 });
  }

  const { serviceId, masterId, locationId, date, timeFrom, lockToken, comment } = parsed.data;

  const lockValue = await redis.get(lockKey(masterId, date, timeFrom));
  if (!lockValue || lockValue !== lockToken) {
    return NextResponse.json(
      { error: "lock_invalid", message: "Час бронювання минув. Оберіть час ще раз." },
      { status: 409 },
    );
  }

  const [service, master, location, specialty] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, isActive: true } }),
    prisma.master.findFirst({ where: { id: masterId, isActive: true }, include: { user: true } }),
    prisma.location.findFirst({ where: { id: locationId, isActive: true } }),
    prisma.masterSpecialty.findUnique({ where: { masterId_serviceId: { masterId, serviceId } } }),
  ]);

  if (!service || !master || !location) {
    return NextResponse.json({ error: "not_found", message: "Дані запису застаріли. Спробуйте ще раз." }, { status: 404 });
  }
  if (!specialty) {
    return NextResponse.json(
      { error: "invalid_master", message: "Цей майстер не надає обрану послугу." },
      { status: 400 },
    );
  }

  const parsedDate = parseDateOnly(date);
  const timeTo = addMinutesToTime(timeFrom, service.durationMinutes);

  try {
    const booking = await withMasterDayLock(masterId, date, async () => {
      const slots = await getAvailableSlots({
        masterId,
        locationId,
        date: parsedDate,
        durationMinutes: service.durationMinutes,
        ignoreLockToken: lockToken,
      });
      if (!slots.includes(timeFrom)) {
        throw new SlotUnavailableError();
      }

      const created = await prisma.booking.create({
        data: {
          clientId: session.sub,
          masterId,
          locationId,
          serviceId,
          date: parsedDate,
          timeFrom,
          timeTo,
          comment,
          status: "pending",
          paymentStatus: "not_required",
          createdVia: "web",
        },
      });

      await redis.del(lockKey(masterId, date, timeFrom));
      return created;
    });

    logAuthEvent({ action: "booking_created", ip, phone: session.phone, bookingId: booking.id });

    const visitAt = visitStartsAt(parsedDate, timeFrom);
    await scheduleReminders(booking.id, visitAt);

    const client = await prisma.user.findUnique({ where: { id: session.sub } });
    const whenText = formatBookingDateTimeUk(parsedDate, timeFrom);

    if (master.user.telegramId) {
      sendTelegramMessage(
        master.user.telegramId.toString(),
        [
          "📅 <b>Нова запис!</b>",
          "",
          `Клієнт: ${client?.name ?? client?.phone ?? "—"}`,
          `Послуга: ${service.name}`,
          `Дата: ${whenText}`,
          `Тривалість: ${service.durationMinutes} хв`,
          `Філіал: ${location.address}`,
          comment ? `Коментар: «${comment}»` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      ).catch((error) => console.error("Failed to notify master", error));
    }

    if (client?.telegramId) {
      sendTelegramMessage(
        client.telegramId.toString(),
        [
          "✅ <b>Запис підтверджено!</b>",
          "",
          `Ви записані до майстра ${master.name}`,
          `Послуга: ${service.name}`,
          `📅 ${whenText}`,
          `📍 ${location.address}`,
          "",
          "Ми нагадаємо вам за день та за 2 години.",
        ].join("\n"),
      ).catch((error) => console.error("Failed to notify client", error));
    }

    return NextResponse.json({ success: true, bookingId: booking.id });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json(
        { error: "slot_unavailable", message: "Цей час вже зайнято. Оберіть інший." },
        { status: 409 },
      );
    }
    if (error instanceof CriticalSectionBusyError) {
      return NextResponse.json(
        { error: "busy", message: "Спробуйте ще раз за кілька секунд." },
        { status: 409 },
      );
    }
    throw error;
  }
}
