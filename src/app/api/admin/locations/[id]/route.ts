import { NextResponse, type NextRequest } from "next/server";
import {
  requireAdmin,
  getAdminLocationDetail,
  updateAdminLocation,
  setLocationActive,
  NotAdminError,
  LocationNotFoundError,
} from "@/lib/admin";
import { adminLocationInputSchema, adminSetActiveSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/locations/[id]">) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const { id } = await ctx.params;
  try {
    const detail = await getAdminLocationDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof LocationNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/locations/[id]">) {
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

  const limit = await rateLimit(`admin:locations:update:${admin.adminId}`, 30, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  const activeOnly = adminSetActiveSchema.safeParse(json);
  if (activeOnly.success && json && Object.keys(json).length === 1) {
    try {
      await setLocationActive(id, activeOnly.data.isActive, admin, ip, userAgent);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof LocationNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
      throw error;
    }
  }

  const parsed = adminLocationInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  try {
    await updateAdminLocation(id, parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof LocationNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
