import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, sendAdminReauthOtp, NotAdminError } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const limit = await rateLimit(`admin:reauth:send:${admin.adminId}`, 5, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." }, { status: 429 });
  }

  const { telegramLinked } = await sendAdminReauthOtp(admin);
  if (!telegramLinked) {
    return NextResponse.json(
      { error: "telegram_not_linked", message: "Ваш акаунт не прив'язаний до Telegram — зверніться до розробника." },
      { status: 422 },
    );
  }

  return NextResponse.json({ success: true, expiresInSeconds: 300 });
}
