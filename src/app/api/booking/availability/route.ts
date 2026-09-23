import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getAvailableSlots, getNextAvailableSlot, parseDateOnly } from "@/lib/booking";
import { availabilityQuerySchema } from "@/lib/validation/booking";
import { getClientIp } from "@/lib/request-ip";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = await rateLimit(`booking:availability:ip:${ip}`, 60, 60);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = availabilityQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірні параметри запиту" }, { status: 400 });
  }

  const { masterId, locationId, serviceId, date } = parsed.data;

  const [master, location, service] = await Promise.all([
    prisma.master.findFirst({ where: { id: masterId, isActive: true } }),
    prisma.location.findFirst({ where: { id: locationId, isActive: true } }),
    prisma.service.findFirst({ where: { id: serviceId, isActive: true } }),
  ]);

  if (!master || !location || !service) {
    return NextResponse.json({ error: "not_found", message: "Майстра, філію або послугу не знайдено" }, { status: 404 });
  }

  const parsedDate = parseDateOnly(date);
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  if (parsedDate < today) {
    return NextResponse.json({ slots: [] });
  }

  const slots = await getAvailableSlots({
    masterId,
    locationId,
    date: parsedDate,
    durationMinutes: service.durationMinutes,
  });

  const nextAvailable =
    slots.length === 0
      ? await getNextAvailableSlot({
          masterId,
          locationId,
          durationMinutes: service.durationMinutes,
          fromDate: parsedDate,
        })
      : null;

  return NextResponse.json({ slots, nextAvailable });
}
