import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, updateAdminBookingStatus, NotAdminError, BookingNotFoundError } from "@/lib/admin";
import { adminBookingStatusSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/bookings/[id]/status">) {
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

  const limit = await rateLimit(`admin:bookings:status:${admin.adminId}`, 60, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато спроб. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminBookingStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний статус" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    await updateAdminBookingStatus(id, parsed.data.status, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
