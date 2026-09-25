import { NextResponse, type NextRequest } from "next/server";
import {
  requireAdmin,
  getAdminServiceDetail,
  updateAdminService,
  setServiceActive,
  NotAdminError,
  ServiceNotFoundError,
  InvalidPriceRangeError,
} from "@/lib/admin";
import { adminServiceInputSchema, adminSetActiveSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isValidUuid } from "@/lib/validation/common";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/services/[id]">) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний ідентифікатор" }, { status: 400 });
  }
  try {
    const detail = await getAdminServiceDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof ServiceNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/services/[id]">) {
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

  const limit = await rateLimit(`admin:services:update:${admin.adminId}`, 30, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний ідентифікатор" }, { status: 400 });
  }
  const json = await request.json().catch(() => null);
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  // A bare `{ isActive }` body is the (de)activation shortcut — same
  // convention as PATCH /api/admin/masters/[id].
  const activeOnly = adminSetActiveSchema.safeParse(json);
  if (activeOnly.success && json && Object.keys(json).length === 1) {
    try {
      await setServiceActive(id, activeOnly.data.isActive, admin, ip, userAgent);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof ServiceNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
      throw error;
    }
  }

  const parsed = adminServiceInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  try {
    await updateAdminService(id, parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ServiceNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error instanceof InvalidPriceRangeError) {
      return NextResponse.json({ error: "invalid_price_range", message: "Ціна «до» не може бути меншою за «від»" }, { status: 400 });
    }
    throw error;
  }
}
