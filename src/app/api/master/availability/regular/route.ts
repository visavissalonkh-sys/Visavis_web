import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAllActiveLocations,
  getMasterForSession,
  getRegularSchedule,
  InvalidScheduleError,
  logMasterAudit,
  updateRegularSchedule,
} from "@/lib/master";
import { regularScheduleSchema } from "@/lib/validation/master";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const locations = await getAllActiveLocations();
  if (locations.length === 0) {
    return NextResponse.json({ locations: [], locationId: null, schedule: [] });
  }

  const requestedLocationId = request.nextUrl.searchParams.get("locationId");
  const locationId = locations.some((l) => l.id === requestedLocationId) ? requestedLocationId! : locations[0].id;

  const schedule = await getRegularSchedule(master.id, locationId);

  return NextResponse.json({
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    locationId,
    schedule,
  });
}

export async function PUT(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const limit = await rateLimit(`master:availability:regular:${master.id}`, 10, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато змін. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = regularScheduleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні дані розкладу" }, { status: 400 });
  }

  const locations = await getAllActiveLocations();
  if (!locations.some((l) => l.id === parsed.data.locationId)) {
    return NextResponse.json({ error: "invalid_location", message: "Філію не знайдено" }, { status: 400 });
  }

  try {
    await updateRegularSchedule(master.id, parsed.data.locationId, parsed.data.schedule);
  } catch (error) {
    if (error instanceof InvalidScheduleError) {
      return NextResponse.json({ error: "invalid_schedule", message: error.message }, { status: 400 });
    }
    throw error;
  }

  await logMasterAudit({
    actorId: session.sub,
    action: "schedule_updated",
    entityType: "master_location",
    entityId: `${master.id}:${parsed.data.locationId}`,
    metadata: { schedule: parsed.data.schedule },
  });

  return NextResponse.json({ success: true });
}
