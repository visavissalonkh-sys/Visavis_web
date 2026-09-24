import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getMasterForSession, getMasterProfile, logMasterAudit, updateMasterProfile } from "@/lib/master";
import { profileUpdateSchema } from "@/lib/validation/master";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const profile = await getMasterProfile(master.id);
  return NextResponse.json(profile);
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

  const limit = await rateLimit(`master:profile:update:${master.id}`, 10, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато змін. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  await updateMasterProfile(master.id, parsed.data);
  await logMasterAudit({
    actorId: session.sub,
    action: "profile_updated",
    entityType: "master",
    entityId: master.id,
  });

  return NextResponse.json({ success: true });
}
