import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanics, new name).
// This only handles page-level redirects for a nicer UX (auto-open the auth
// modal instead of a bare 401). Every mutating API route still checks the
// session itself — proxy matchers are easy to get out of sync with routes
// added later, so it must never be the only guard.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const url = new URL("/", request.url);
    url.searchParams.set("auth", "required");
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname.startsWith("/master") && session.role !== "master") {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/master/:path*", "/booking/success"],
};
