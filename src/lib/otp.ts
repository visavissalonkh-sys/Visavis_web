import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { redis } from "@/lib/redis";

const OTP_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const BCRYPT_ROUNDS = 10;

const otpKey = (phone: string) => `otp:code:${phone}`;
const attemptsKey = (phone: string) => `otp:attempts:${phone}`;
const lockoutKey = (phone: string) => `otp:lockout:${phone}`;

/** crypto.randomInt is a CSPRNG — Math.random() must never be used for OTPs. */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function isLockedOut(phone: string): Promise<boolean> {
  return (await redis.exists(lockoutKey(phone))) === 1;
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const hash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  await redis.set(otpKey(phone), hash, "EX", OTP_TTL_SECONDS);
  await redis.del(attemptsKey(phone));
}

export type VerifyOtpResult = "ok" | "no_code" | "mismatch" | "locked";

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  if (await isLockedOut(phone)) {
    return "locked";
  }

  const hash = await redis.get(otpKey(phone));
  if (!hash) {
    return "no_code";
  }

  // bcrypt.compare re-hashes the input with the stored salt and compares the
  // full digests — it doesn't short-circuit on the first differing byte, so
  // it is timing-safe by construction (unlike a plain `===` on raw hashes).
  const matches = await bcrypt.compare(code, hash);

  if (matches) {
    await redis.del(otpKey(phone), attemptsKey(phone));
    return "ok";
  }

  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) {
    await redis.expire(attemptsKey(phone), OTP_TTL_SECONDS);
  }

  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    await redis.set(lockoutKey(phone), "1", "EX", LOCKOUT_SECONDS);
    await redis.del(otpKey(phone));
    return "locked";
  }

  return "mismatch";
}
