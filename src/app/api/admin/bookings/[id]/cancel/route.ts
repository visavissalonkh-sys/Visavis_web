import { NextResponse, type NextRequest } from "next/server";
import {
  requireAdmin,
  cancelAdminBooking,
  NotAdminError,
  BookingNotFoundError,
  BookingAlreadyInactiveError,
} from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/bookings/[id]/cancel">) {
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

  const limit = await rateLimit(`admin:bookings:cancel:${admin.adminId}`, 60, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    await cancelAdminBooking(id, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof BookingAlreadyInactiveError) {
      return NextResponse.json({ error: "already_inactive", message: "Цей запис вже неактивний" }, { status: 400 });
    }
    throw error;
  }
}
