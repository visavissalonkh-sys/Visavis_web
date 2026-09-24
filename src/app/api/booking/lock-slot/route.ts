import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";
import { getAvailableSlots, lockKey, parseDateOnly, LOCK_TTL_SECONDS } from "@/lib/booking";
import { lockSlotSchema } from "@/lib/validation/booking";
import { getClientIp } from "@/lib/request-ip";
import { isTrustedOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`booking:lock:ip:${ip}`, 20, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = lockSlotSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні дані" }, { status: 400 });
  }

  const { masterId, locationId, serviceId, date, timeFrom } = parsed.data;

  const service = await prisma.service.findFirst({ where: { id: serviceId, isActive: true } });
  if (!service) {
    return NextResponse.json({ error: "not_found", message: "Послугу не знайдено" }, { status: 404 });
  }

  const parsedDate = parseDateOnly(date);
  const slots = await getAvailableSlots({
    masterId,
    locationId,
    date: parsedDate,
    durationMinutes: service.durationMinutes,
  });

  if (!slots.includes(timeFrom)) {
    return NextResponse.json(
      { error: "slot_unavailable", message: "Цей час вже недоступний. Оберіть інший." },
      { status: 409 },
    );
  }

  const token = crypto.randomUUID();
  const key = lockKey(masterId, date, timeFrom);
  const acquired = await redis.set(key, token, "EX", LOCK_TTL_SECONDS, "NX");

  if (!acquired) {
    return NextResponse.json(
      { error: "slot_locked", message: "Цей час вже бронює інший клієнт. Оберіть інший." },
      { status: 409 },
    );
  }

  return NextResponse.json({ lockToken: token, expiresInSeconds: LOCK_TTL_SECONDS });
}
