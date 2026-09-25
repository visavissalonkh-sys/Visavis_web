import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getAdminServicesList, createAdminService, NotAdminError, InvalidPriceRangeError } from "@/lib/admin";
import { adminServiceInputSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const services = await getAdminServicesList();
  return NextResponse.json({ services });
}

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

  const limit = await rateLimit(`admin:services:create:${admin.adminId}`, 30, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminServiceInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    const service = await createAdminService(parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true, serviceId: service.id });
  } catch (error) {
    if (error instanceof InvalidPriceRangeError) {
      return NextResponse.json({ error: "invalid_price_range", message: "Ціна «до» не може бути меншою за «від»" }, { status: 400 });
    }
    throw error;
  }
}
