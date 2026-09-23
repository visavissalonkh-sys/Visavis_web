import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateOtpCode, storeOtp, isLockedOut } from "@/lib/otp";
import { sendTelegramMessage } from "@/lib/notifications";
import { sendOtpSchema } from "@/lib/validation/auth";
import { logAuthEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { isTrustedOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const json = await request.json().catch(() => null);
  const parsed = sendOtpSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_phone", message: "Невірний формат номера телефону" },
      { status: 400 },
    );
  }

  const { phone } = parsed.data;

  const [ipLimit, phoneLimit] = await Promise.all([
    rateLimit(`otp:send:ip:${ip}`, 3, 600),
    rateLimit(`otp:send:phone:${phone}`, 3, 600),
  ]);

  if (!ipLimit.success || !phoneLimit.success) {
    logAuthEvent({ action: "send_otp_rate_limited", ip, phone });
    return NextResponse.json(
      { error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." },
      { status: 429 },
    );
  }

  if (await isLockedOut(phone)) {
    return NextResponse.json(
      {
        error: "locked",
        message: "Цей номер тимчасово заблоковано через забагато невдалих спроб. Спробуйте через 15 хвилин.",
      },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user?.telegramId) {
    logAuthEvent({ action: "send_otp_no_telegram", ip, phone });
    return NextResponse.json(
      {
        error: "telegram_not_linked",
        message: "Спочатку напишіть /start нашому боту в Telegram, щоб отримувати код підтвердження.",
      },
      { status: 422 },
    );
  }

  const code = generateOtpCode();
  await storeOtp(phone, code);

  try {
    await sendTelegramMessage(
      user.telegramId.toString(),
      `Ваш код для Visavis: <b>${code}</b>\nДійсний 5 хвилин. Нікому його не повідомляйте.`,
    );
  } catch (error) {
    console.error("send-otp: Telegram delivery failed", error);
    return NextResponse.json(
      { error: "telegram_send_failed", message: "Не вдалося надіслати код. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  logAuthEvent({ action: "send_otp", ip, phone });

  return NextResponse.json({ success: true, expiresInSeconds: 300 });
}
