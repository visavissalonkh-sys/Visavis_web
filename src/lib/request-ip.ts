import type { NextRequest } from "next/server";

/**
 * `X-Forwarded-For` is a comma-separated hop chain, left-to-right in the
 * order each proxy *received* the request — so the leftmost entry is
 * whatever the original client sent, which is entirely attacker-controlled
 * (`X-Forwarded-For: 1.2.3.4` bypasses every IP-keyed rate limit if you
 * trust it). The rightmost entry is the one *our own* trusted reverse proxy
 * (Railway's edge) appended, which the client cannot forge — that's the
 * only hop worth trusting here, since there's exactly one proxy in front
 * of this app. If that topology ever changes (e.g. an additional CDN in
 * front of Railway), this needs to trust the Nth-from-right hop instead.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
