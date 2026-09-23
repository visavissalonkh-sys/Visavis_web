import type { NextRequest } from "next/server";

/**
 * Defense-in-depth alongside SameSite=Strict on the session cookie (the
 * primary CSRF defense): reject cross-origin mutating requests that do send
 * an Origin header. Browsers always attach Origin to fetch()/XHR requests
 * with a body, so a same-origin app request will always pass this check.
 */
export function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const allowed = new Set([request.nextUrl.origin, siteUrl].filter(Boolean));
  return allowed.has(origin);
}
