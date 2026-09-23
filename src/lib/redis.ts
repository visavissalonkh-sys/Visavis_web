import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  // lazyConnect: don't dial out the moment this module is imported (e.g.
  // during `next build`'s route collection) — only on the first real command.
  return new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
}

export const redis = globalForRedis.redis ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
