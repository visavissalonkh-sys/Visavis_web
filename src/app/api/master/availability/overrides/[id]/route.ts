import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteOverride, getMasterForSession, logMasterAudit } from "@/lib/master";
import { isTrustedOrigin } from "@/lib/csrf";
import { isValidUuid } from "@/lib/validation/common";

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/master/availability/overrides/[id]">,
) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний ідентифікатор" }, { status: 400 });
  }
  const deleted = await deleteOverride(master.id, id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await logMasterAudit({
    actorId: session.sub,
    action: "availability_override_deleted",
    entityType: "master_availability_override",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
