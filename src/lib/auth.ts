import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";
import { redis } from "@/lib/redis";

export const SESSION_COOKIE_NAME = "visavis_session";
const CLIENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
// Admins get a short-lived token instead — a stolen/forgotten admin session
// self-expires in hours, not weeks.
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

export type UserRole = "client" | "master" | "admin";

export type SessionPayload = {
  sub: string;
  phone: string;
  role: UserRole;
  jti: string;
  exp: number;
};

function getSecretKey() {
  return new TextEncoder().encode(requireEnv("JWT_SECRET"));
}

function sessionMaxAgeSeconds(role: UserRole): number {
  return role === "admin" ? ADMIN_SESSION_MAX_AGE_SECONDS : CLIENT_SESSION_MAX_AGE_SECONDS;
}

export async function signSession(payload: { sub: string; phone: string; role: UserRole }): Promise<string> {
  // Web Crypto's global `crypto.randomUUID()`, not node:crypto's — this
  // module is imported by proxy.ts, which runs on the Edge Runtime and
  // doesn't support Node core modules.
  const jti = crypto.randomUUID();
  return new SignJWT({ sub: payload.sub, phone: payload.phone, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(`${sessionMaxAgeSeconds(payload.role)}s`)
    .sign(getSecretKey());
}

function blacklistKey(jti: string): string {
  return `jwt:blacklist:${jti}`;
}

/** Immediately kills one specific token (by jti) — used on logout. Does NOT
 * affect any other session the same user has open on another device; see
 * the admin role-change flow (Stage 5) for invalidating every session at once. */
export async function blacklistJti(jti: string, expUnixSeconds: number): Promise<void> {
  const ttl = expUnixSeconds - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.set(blacklistKey(jti), "1", "EX", ttl);
  }
}

async function isJtiBlacklisted(jti: string): Promise<boolean> {
  return (await redis.get(blacklistKey(jti))) !== null;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (await isJtiBlacklisted(payload.jti)) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Reads and verifies the session from the request cookies (Server Components, Route Handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Route Handlers / Server Functions only — cookies can't be set while rendering. */
export async function setSessionCookie(token: string, role: UserRole): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: sessionMaxAgeSeconds(role),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
