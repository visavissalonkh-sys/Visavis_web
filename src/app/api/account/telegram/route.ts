import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getAccountUser, getTelegramStatus, unlinkTelegram } from "@/lib/account";
import { isTrustedOrigin } from "@/lib/csrf";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await getAccountUser(session);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(getTelegramStatus(user));
}

export async function DELETE(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await unlinkTelegram(session.sub);
  return NextResponse.json({ success: true });
}
