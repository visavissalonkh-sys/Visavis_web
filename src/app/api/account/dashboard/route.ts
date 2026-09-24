import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAccountUser, getDashboardData } from "@/lib/account";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getAccountUser(session);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = await getDashboardData(user);
  return NextResponse.json(data);
}
