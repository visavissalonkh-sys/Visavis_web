import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isValidUuid } from "@/lib/validation/common";

export async function GET(_request: Request, ctx: RouteContext<"/api/booking/[id]">) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "invalid_input", message: "Невірний ідентифікатор" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true, master: true, location: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // IDOR guard: a client only ever sees their own booking; a master only
  // theirs; admins see everything. Never trust the URL id alone.
  const isOwner = booking.clientId === session.sub;
  const isAssignedMaster =
    session.role === "master" &&
    (await prisma.master.findFirst({ where: { id: booking.masterId, userId: session.sub } })) !== null;
  const isAdmin = session.role === "admin";

  if (!isOwner && !isAssignedMaster && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ booking });
}
