import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getMasterForSession, getOwnedBooking, logMasterAudit } from "@/lib/master";
import { isTrustedOrigin } from "@/lib/csrf";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/master/bookings/[id]/complete">) {
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
  const booking = await getOwnedBooking(master.id, id);
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "invalid_status", message: "Завершити можна лише підтверджений запис." },
      { status: 400 },
    );
  }

  await prisma.booking.update({ where: { id }, data: { status: "completed" } });
  await logMasterAudit({ actorId: session.sub, action: "booking_completed", entityType: "booking", entityId: id });

  return NextResponse.json({ success: true });
}
