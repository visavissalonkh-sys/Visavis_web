import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
