import { NextResponse, type NextRequest } from "next/server";
import {
  requireAdmin,
  getAdminMasterDetail,
  updateAdminMaster,
  reactivateAdminMaster,
  NotAdminError,
  MasterNotFoundError,
  InvalidScheduleError,
} from "@/lib/admin";
import { adminUpdateMasterSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isValidUuid } from "@/lib/validation/common";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/masters/[id]">) {
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
    const detail = await getAdminMasterDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof MasterNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/masters/[id]">) {
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

  const limit = await rateLimit(`admin:masters:update:${admin.adminId}`, 30, 300);
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

  // A bare `{ isActive: true }` body is the reactivation shortcut — plain
  // undo of a soft-delete, no re-auth needed (unlike deactivation, which has
  // its own dedicated endpoint precisely because it isn't reversible-by-a-
  // click the same way — bookings may already have been cancelled by then).
  if (json && typeof json === "object" && Object.keys(json).length === 1 && json.isActive === true) {
    try {
      await reactivateAdminMaster(id, admin, ip, userAgent);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof MasterNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
      throw error;
    }
  }
  if (json && typeof json === "object" && "isActive" in json && json.isActive === false) {
    return NextResponse.json(
      { error: "use_deactivate_endpoint", message: "Для деактивації використайте PATCH /api/admin/masters/[id]/deactivate" },
      { status: 400 },
    );
  }

  const parsed = adminUpdateMasterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  try {
    await updateAdminMaster(id, parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MasterNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof InvalidScheduleError) {
      return NextResponse.json({ error: "invalid_schedule", message: error.message }, { status: 400 });
    }
    throw error;
  }
}
