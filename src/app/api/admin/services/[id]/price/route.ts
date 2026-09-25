import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, updateAdminServicePrice, NotAdminError, ServiceNotFoundError, InvalidPriceRangeError } from "@/lib/admin";
import { adminServicePriceUpdateSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/services/[id]/price">) {
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

  const limit = await rateLimit(`admin:services:price:${admin.adminId}`, 60, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminServicePriceUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    await updateAdminServicePrice(id, parsed.data.priceFrom, parsed.data.priceTo ?? null, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ServiceNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error instanceof InvalidPriceRangeError) {
      return NextResponse.json({ error: "invalid_price_range", message: "Ціна «до» не може бути меншою за «від»" }, { status: 400 });
    }
    throw error;
  }
}
