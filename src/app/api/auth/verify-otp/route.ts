import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verifyOtp } from "@/lib/otp";
import { signSession, setSessionCookie } from "@/lib/auth";
import { verifyOtpSchema } from "@/lib/validation/auth";
import { logAuthEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import { isTrustedOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const json = await request.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Перевірте номер телефону та код." },
      { status: 400 },
    );
  }

  const { phone, code } = parsed.data;

  const ipLimit = await rateLimit(`otp:verify:ip:${ip}`, 15, 300);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." },
      { status: 429 },
    );
  }

  const result = await verifyOtp(phone, code);

  if (result === "locked") {
    logAuthEvent({ action: "verify_otp_locked", ip, phone });
    return NextResponse.json(
      { error: "locked", message: "Забагато невірних спроб. Номер заблоковано на 15 хвилин." },
      { status: 429 },
    );
  }

  if (result === "no_code") {
    return NextResponse.json(
      { error: "no_code", message: "Код недійсний або протермінований. Надішліть новий." },
      { status: 400 },
    );
  }

  if (result === "mismatch") {
    logAuthEvent({ action: "verify_otp_mismatch", ip, phone });
    return NextResponse.json({ error: "mismatch", message: "Невірний код." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    // Shouldn't happen — send-otp only issues a code for an existing, linked user.
    logAuthEvent({ action: "verify_otp_user_missing", ip, phone });
    return NextResponse.json({ error: "not_found", message: "Користувача не знайдено." }, { status: 404 });
  }

  const token = await signSession({ sub: user.id, phone: user.phone, role: user.role });
  await setSessionCookie(token, user.role);

  logAuthEvent({ action: "verify_otp_success", ip, phone });

  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
  });
}
