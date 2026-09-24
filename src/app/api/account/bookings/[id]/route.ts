import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookingDetail } from "@/lib/account";

export async function GET(_request: Request, ctx: RouteContext<"/api/account/bookings/[id]">) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const booking = await getBookingDetail(session.sub, id);
  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(booking);
}
