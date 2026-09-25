import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, unpublishReview, NotAdminError, ReviewNotFoundError } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isValidUuid } from "@/lib/validation/common";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/reviews/[id]/unpublish">) {
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

  const limit = await rateLimit(`admin:reviews:moderate:${admin.adminId}`, 15, 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Забагато дій поспіль. Зачекайте хвилину." },
      { status: 429 },
    );
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний ідентифікатор" }, { status: 400 });
  }
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    await unpublishReview(id, admin, ip, userAgent);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ReviewNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
