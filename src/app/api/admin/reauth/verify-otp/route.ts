import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, verifyAdminReauthOtp, NotAdminError } from "@/lib/admin";
import { reauthVerifySchema } from "@/lib/validation/admin";
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

  const limit = await rateLimit(`admin:reauth:verify:${admin.adminId}`, 10, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = reauthVerifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Код має складатись з 6 цифр" }, { status: 400 });
  }

  const result = await verifyAdminReauthOtp(admin, parsed.data.code);

  if (result === "locked") {
    return NextResponse.json({ error: "locked", message: "Забагато невірних спроб. Спробуйте через 15 хвилин." }, { status: 429 });
  }
  if (result === "no_code") {
    return NextResponse.json({ error: "no_code", message: "Код недійсний або протермінований. Надішліть новий." }, { status: 400 });
  }
  if (result === "mismatch") {
    return NextResponse.json({ error: "mismatch", message: "Невірний код." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
