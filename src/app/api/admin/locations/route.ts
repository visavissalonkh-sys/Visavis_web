import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getAdminLocationsList, createAdminLocation, NotAdminError } from "@/lib/admin";
import { adminLocationInputSchema } from "@/lib/validation/admin";
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

  const locations = await getAdminLocationsList();
  return NextResponse.json({ locations });
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

  const limit = await rateLimit(`admin:locations:create:${admin.adminId}`, 20, 3600);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminLocationInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  const location = await createAdminLocation(parsed.data, admin, ip, userAgent);
  return NextResponse.json({ success: true, locationId: location.id });
}
