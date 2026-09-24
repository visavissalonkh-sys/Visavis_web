import { NextResponse, type NextRequest } from "next/server";
import { blacklistJti, clearSessionCookie, getSession } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // Blacklist this specific token immediately — without it, logout only
  // deletes the cookie; the JWT itself stays valid until it expires and
  // would still work if replayed (e.g. from a copied cookie value).
  const session = await getSession();
  if (session) {
    await blacklistJti(session.jti, session.exp);
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
