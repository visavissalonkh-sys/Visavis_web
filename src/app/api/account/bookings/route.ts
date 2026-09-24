import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookingsList, type AccountBookingsTab } from "@/lib/account";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const tab: AccountBookingsTab = searchParams.get("tab") === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const data = await getBookingsList({ clientId: session.sub, tab, page });
  return NextResponse.json(data);
}
