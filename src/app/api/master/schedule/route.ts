import { NextResponse, type NextRequest } from "next/server";
import { startOfWeek } from "date-fns";
import { getSession } from "@/lib/auth";
import {
  getAllActiveLocations,
  getMasterForSession,
  getMasterWorkingLocations,
  getWeekSchedule,
} from "@/lib/master";
import { parseDateOnly } from "@/lib/booking";
import { getSalonToday } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const workingLocations = await getMasterWorkingLocations(master.id);
  const allLocations = workingLocations.length > 0 ? workingLocations : await getAllActiveLocations();
  if (allLocations.length === 0) {
    return NextResponse.json({ locations: [], locationId: null, days: [] });
  }

  const requestedLocationId = request.nextUrl.searchParams.get("locationId");
  const locationId = allLocations.some((l) => l.id === requestedLocationId)
    ? requestedLocationId!
    : allLocations[0].id;

  const weekParam = request.nextUrl.searchParams.get("week");
  const anchor = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? parseDateOnly(weekParam) : getSalonToday();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });

  const days = await getWeekSchedule(master.id, locationId, weekStart);

  return NextResponse.json({
    locations: allLocations.map((l) => ({ id: l.id, name: l.name })),
    locationId,
    weekStart: weekStart.toISOString().slice(0, 10),
    days,
  });
}
