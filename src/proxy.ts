import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanics, new name)
// and defaults it to the Node.js runtime (not Edge) — confirmed against
// node_modules/next/dist/docs for this exact installed version, since this
// changed between major versions. That matters here: verifySessionToken's
// JWT-blacklist check goes through ioredis, which needs Node.js, not Edge.
//
// The auth-redirect logic below only handles page-level UX (auto-open the
// auth modal instead of a bare 401). Every mutating API route still checks
// the session itself — proxy matchers are easy to get out of sync with
// routes added later, so this must never be the only guard. The security
// headers below, however, are NOT just UX — they're applied here (rather
// than next.config.ts) specifically because the CSP nonce must be generated
// fresh per request, which only middleware can do.
const AUTH_GUARDED_PREFIXES = ["/account", "/master", "/admin"];
const AUTH_GUARDED_EXACT = new Set(["/booking/success"]);

// Zero-Trust level 1 (of 3 — see lib/admin.ts for level 2, the route-level
// requireAdmin re-check). Global cap on /admin/* regardless of auth state,
// so it also throttles unauthenticated probing, not just legitimate admins.
const ADMIN_RATE_LIMIT_PER_MINUTE = 100;

// Segment-aware: "/master" must match "/master" or "/master/…" but never
// "/masters/…" (the public masters listing/profile pages). A plain
// `.startsWith()` doesn't respect that boundary — this used to be handled
// for free by Next's own `/master/:path*` matcher syntax back when the
// matcher only covered the guarded routes; now that it covers every path
// (see `config` below, needed for site-wide security headers), this
// function has to do that segment check itself.
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function needsAuth(pathname: string): boolean {
  return AUTH_GUARDED_EXACT.has(pathname) || AUTH_GUARDED_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets scripts loaded by a nonce'd <script> (Next.js's
    // own chunks) load further scripts without each one needing the nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Inline styles stay unsafe-inline: Next.js/Tailwind don't emit inline
    // <script>-equivalent risk here — a CSS-injection ceiling is a much
    // smaller blast radius than script execution, and nonce'ing every
    // framework-emitted style tag isn't practically supported today.
    "style-src 'self' 'unsafe-inline'",
    // Fonts (Inter, Cormorant Garamond) go through next/font/google, which
    // downloads and self-hosts them at build time — nothing is ever fetched
    // from fonts.googleapis.com/fonts.gstatic.com at runtime, so there's no
    // reason to trust those origins here.
    "font-src 'self'",
    "img-src 'self' data: https://res.cloudinary.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);
  const pathname = request.nextUrl.pathname;

  if (matchesPrefix(pathname, "/admin")) {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`admin:ip:${ip}`, ADMIN_RATE_LIMIT_PER_MINUTE, 60);
    if (!limit.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "rate_limited" }, { status: 429 }),
        csp,
      );
    }
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (needsAuth(pathname) && !session) {
    const url = new URL("/", request.url);
    url.searchParams.set("auth", "required");
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return applySecurityHeaders(NextResponse.redirect(url), csp);
  }

  if (matchesPrefix(pathname, "/master") && session && session.role !== "master") {
    return applySecurityHeaders(NextResponse.redirect(new URL("/account", request.url)), csp);
  }

  // Hard check, not "admin or higher" — there is no "higher". A session
  // whose JWT still claims role=admin after a demotion is caught here too,
  // since verifySessionToken already rejects a token blacklisted or version-
  // bumped by blacklistUserJWTs (lib/admin.ts) on that demotion.
  if (matchesPrefix(pathname, "/admin") && session && session.role !== "admin") {
    return applySecurityHeaders(NextResponse.redirect(new URL("/account", request.url)), csp);
  }

  // Forward the nonce as a request header so Server Components can read it
  // via `headers()` and stamp it onto their own inline <script> tags
  // (JSON-LD) — Next.js auto-applies the same nonce to its own scripts once
  // it sees this response's CSP header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, csp);
}

export const config = {
  // Run on everything except static assets and Next's own internals, so the
  // security headers apply site-wide — not just the auth-guarded routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
