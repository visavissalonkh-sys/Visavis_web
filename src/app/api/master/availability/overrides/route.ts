import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createOverride,
  getMasterForSession,
  getOverrides,
  InvalidScheduleError,
  logMasterAudit,
  OverrideConflictError,
  PastDateError,
} from "@/lib/master";
import { overrideCreateSchema } from "@/lib/validation/master";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const overrides = await getOverrides(master.id);
  return NextResponse.json({ overrides });
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const limit = await rateLimit(`master:availability:overrides:${master.id}`, 20, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато змін. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = overrideCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні дані" }, { status: 400 });
  }

  try {
    const override = await createOverride(master.id, parsed.data);
    await logMasterAudit({
      actorId: session.sub,
      action: "availability_override_created",
      entityType: "master_availability_override",
      entityId: override.id,
      metadata: { ...parsed.data },
    });
    return NextResponse.json({ success: true, id: override.id });
  } catch (error) {
    if (error instanceof PastDateError) {
      return NextResponse.json({ error: "past_date", message: "Не можна змінити доступність на минулу дату." }, { status: 400 });
    }
    if (error instanceof InvalidScheduleError) {
      return NextResponse.json({ error: "invalid_time", message: error.message }, { status: 400 });
    }
    if (error instanceof OverrideConflictError) {
      return NextResponse.json(
        { error: "conflict", message: "На цю дату вже є зміна доступності, яка перетинається." },
        { status: 409 },
      );
    }
    throw error;
  }
}
