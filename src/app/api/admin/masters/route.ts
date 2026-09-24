import { NextResponse, type NextRequest } from "next/server";
import {
  requireAdmin,
  getAdminMastersList,
  createAdminMaster,
  NotAdminError,
  InvalidPhoneError,
  MasterPhoneConflictError,
  InvalidScheduleError,
} from "@/lib/admin";
import { adminCreateMasterSchema } from "@/lib/validation/admin";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const masters = await getAdminMastersList();
  return NextResponse.json({ masters });
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  // "макс 10 создания мастеров в час" — Stage 5 spec, section 1.
  const limit = await rateLimit(`admin:masters:create:${admin.adminId}`, 10, 3600);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато створень майстрів за годину." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminCreateMasterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  try {
    const master = await createAdminMaster(parsed.data, admin, ip, userAgent);
    return NextResponse.json({ success: true, masterId: master.id });
  } catch (error) {
    if (error instanceof InvalidPhoneError) {
      return NextResponse.json({ error: "invalid_phone", message: "Невірний номер телефону" }, { status: 400 });
    }
    if (error instanceof MasterPhoneConflictError) {
      return NextResponse.json(
        { error: "phone_conflict", message: "Цей номер вже використовується іншим акаунтом або майстром" },
        { status: 409 },
      );
    }
    if (error instanceof InvalidScheduleError) {
      return NextResponse.json({ error: "invalid_schedule", message: error.message }, { status: 400 });
    }
    throw error;
  }
}
