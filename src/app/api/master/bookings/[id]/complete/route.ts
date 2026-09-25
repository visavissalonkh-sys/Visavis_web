import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getMasterForSession, getOwnedBooking, logMasterAudit } from "@/lib/master";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { queueSheetsSync } from "@/lib/sheets";

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

  const limit = await rateLimit(`master:actions:${master.id}`, 30, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато дій. Спробуйте за хвилину." }, { status: 429 });
  }

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
  await queueSheetsSync(id, "status_changed");
  await logMasterAudit({ actorId: session.sub, action: "booking_completed", entityType: "booking", entityId: id });

  return NextResponse.json({ success: true });
}
