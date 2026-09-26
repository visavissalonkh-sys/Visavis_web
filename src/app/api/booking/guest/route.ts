import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/csrf";
import { getClientIp } from "@/lib/request-ip";
import { guestBookingSchema } from "@/lib/validation/booking";
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
import { queueSheetsSync } from "@/lib/sheets";
import { notifyAdmins } from "@/lib/alerts";

/**
 * Guest checkout — no session required. Mirrors /api/booking's locking and
 * race-condition handling exactly (same lockToken from the same DateTimeStep,
 * same withMasterDayLock critical section); the only real difference is who
 * ends up as the booking's contact: an existing account found by phone, or a
 * guest identified by guestName/guestPhone stored on the booking itself.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const ipLimit = await rateLimit(`booking:guest:ip:${ip}`, 5, 3600);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." },
      { status: 429 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = guestBookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні дані запису" }, { status: 400 });
  }

  const { serviceId, masterId, locationId, date, timeFrom, lockToken, guestName, guestPhone, comment, website } =
    parsed.data;

  // Honeypot: a real visitor never sees or fills this field. Respond exactly
  // like a real success (same shape, a fresh random id) without touching the
  // database, so a scraping bot gets no signal that it was caught.
  if (website) {
    return NextResponse.json({ bookingId: crypto.randomUUID(), status: "pending" });
  }

  const phoneLimit = await rateLimit(`booking:guest:phone:${guestPhone}`, 3, 3600);
  if (!phoneLimit.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Забагато спроб з цього номера. Спробуйте пізніше." },
      { status: 429 },
    );
  }

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
    const { booking, existingUser } = await withMasterDayLock(masterId, date, async () => {
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

      // A guest checking out with a phone that already has an account is
      // just that account's client — never create a second identity for the
      // same person, and never leave a "guest" row an already-registered
      // user can't see in their own booking history.
      const existingUser = await prisma.user.findUnique({ where: { phone: guestPhone } });

      const created = await prisma.booking.create({
        data: existingUser
          ? {
              clientId: existingUser.id,
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
              isGuest: false,
            }
          : {
              clientId: null,
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
              isGuest: true,
              guestName,
              guestPhone,
            },
      });

      await redis.del(lockKey(masterId, date, timeFrom));
      return { booking: created, existingUser };
    });

    logAuthEvent({ action: "guest_booking_created", ip, phone: guestPhone, bookingId: booking.id });

    const visitAt = visitStartsAt(parsedDate, timeFrom);
    // Queued unconditionally, even though a pure guest has no telegramId to
    // remind yet — Visavis_bot's merge_guest_bookings re-schedules reminders
    // once the phone number registers a real account, but only for bookings
    // it can still find in Redis; skipping this here would silently drop
    // reminders for anyone who registers between now and their visit.
    await scheduleReminders(booking.id, visitAt);
    await queueSheetsSync(booking.id, "created");

    const whenText = formatBookingDateTimeUk(parsedDate, timeFrom);

    if (master.user.telegramId) {
      sendTelegramMessage(
        master.user.telegramId.toString(),
        [
          "📅 <b>Нова запис!</b>",
          "",
          `Клієнт: ${existingUser?.name ?? guestName} (${guestPhone})`,
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

    if (existingUser?.telegramId) {
      sendTelegramMessage(
        existingUser.telegramId.toString(),
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

    notifyAdmins(
      [
        "🆕 <b>Новий запис</b>" + (booking.isGuest ? " (гість)" : ""),
        "",
        `Клієнт: ${existingUser?.name ?? guestName} (${guestPhone})`,
        `Майстер: ${master.name}`,
        `Послуга: ${service.name}`,
        `📅 ${whenText}`,
        `📍 ${location.address}`,
      ].join("\n"),
    ).catch((error) => console.error("Failed to notify admins of new booking", error));

    return NextResponse.json({ bookingId: booking.id, status: booking.status });
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
