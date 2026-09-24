import { NextResponse, type NextRequest } from "next/server";
import {
  requireAdmin,
  requireRecentReauth,
  deactivateAdminMaster,
  getActiveMasterBookingsCount,
  NotAdminError,
  ReauthRequiredError,
  MasterNotFoundError,
} from "@/lib/admin";
import { deactivateMasterSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

/** GET so the confirmation UI can show "У майстра є N активних записів"
 * before the admin even picks cancel-all vs leave-them. */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/masters/[id]/deactivate">) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const { id } = await ctx.params;
  const activeBookingsCount = await getActiveMasterBookingsCount(id);
  return NextResponse.json({ activeBookingsCount });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/masters/[id]/deactivate">) {
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

  try {
    await requireRecentReauth(admin);
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      return NextResponse.json({ error: "reauth_required", message: "Підтвердіть дію кодом з Telegram" }, { status: 403 });
    }
    throw error;
  }

  const limit = await rateLimit(`admin:masters:deactivate:${admin.adminId}`, 20, 3600);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = deactivateMasterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Вкажіть, чи скасовувати активні записи" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    const result = await deactivateAdminMaster(id, parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true, cancelledCount: result.cancelledCount });
  } catch (error) {
    if (error instanceof MasterNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
