import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardData, getMasterForSession } from "@/lib/master";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) {
    return NextResponse.json({ error: "not_a_master" }, { status: 403 });
  }

  const data = await getDashboardData(master.id, master.name);
  return NextResponse.json(data);
}
