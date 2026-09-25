import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookingDetail, getMasterForSession } from "@/lib/master";
import { isValidUuid } from "@/lib/validation/common";

export async function GET(_request: Request, ctx: RouteContext<"/api/master/bookings/[id]">) {
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
  const detail = await getBookingDetail(master.id, id);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(detail);
}
