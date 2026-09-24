import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getAccountUser, updateAccountName } from "@/lib/account";
import { accountProfileUpdateSchema } from "@/lib/validation/account";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getAccountUser(session);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ name: user.name, phone: user.phone, createdAt: user.createdAt });
}

export async function PATCH(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`account:profile:update:${session.sub}`, 10, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато змін. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = accountProfileUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  await updateAccountName(session.sub, parsed.data.name);
  return NextResponse.json({ success: true });
}
