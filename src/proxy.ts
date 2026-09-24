import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

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
const AUTH_GUARDED_PREFIXES = ["/account", "/master"];
const AUTH_GUARDED_EXACT = new Set(["/booking/success"]);

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
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
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
