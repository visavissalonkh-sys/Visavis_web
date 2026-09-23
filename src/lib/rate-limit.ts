import { redis } from "@/lib/redis";

// Fixed-window rate limiter backed by Redis — shared between the web app and
// the bot via the same Redis instance. Use one `key` per (route + identifier),
// e.g. `otp:${phone}` or `booking:${ip}`.
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }

  const ttl = await redis.ttl(redisKey);

  return {
    success: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetInSeconds: ttl >= 0 ? ttl : windowSeconds,
  };
}
