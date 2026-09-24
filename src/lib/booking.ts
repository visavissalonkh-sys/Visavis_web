import crypto from "node:crypto";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const SLOT_INTERVAL_MINUTES = 30;
export const LOCK_TTL_SECONDS = 600; // 10 minutes

export type Range = [number, number]; // minutes from midnight

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

/** Parses "YYYY-MM-DD" as a UTC midnight Date — matches Prisma's `@db.Date` columns. */
export function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "П'ятниця, 25 вересня о 14:00" */
export function formatBookingDateTimeUk(date: Date, time: string): string {
  const weekdayAndDate = format(date, "EEEE, d MMMM", { locale: uk });
  const capitalized = weekdayAndDate.charAt(0).toUpperCase() + weekdayAndDate.slice(1);
  return `${capitalized} о ${time}`;
}

export function subtractRange(ranges: Range[], block: Range): Range[] {
  const result: Range[] = [];
  for (const [start, end] of ranges) {
    if (block[1] <= start || block[0] >= end) {
      result.push([start, end]);
      continue;
    }
    if (block[0] > start) result.push([start, block[0]]);
    if (block[1] < end) result.push([block[1], end]);
  }
  return result;
}

export function lockKey(masterId: string, date: string, timeFrom: string): string {
  return `booking:lock:${masterId}:${date}:${timeFrom}`;
}

/**
 * Available slot start times ("HH:MM") for a master at a specific location and
 * date, given a service duration. Accounts for: the master's recurring weekly
 * schedule, one-off overrides (day off / extra slot / blocked range), existing
 * bookings, and in-flight Redis locks from other clients mid-checkout.
 */
export async function getAvailableSlots({
  masterId,
  locationId,
  date,
  durationMinutes,
  ignoreLockToken,
}: {
  masterId: string;
  locationId: string;
  date: Date;
  durationMinutes: number;
  /**
   * Treat the slot holding this exact lock token as free. Used only by the
   * booking-creation recheck, which already validated ownership of that lock
   * and would otherwise see its own advisory lock as "taken by someone else".
   */
  ignoreLockToken?: string;
}): Promise<string[]> {
  const weekday = date.getUTCDay();

  const [override, schedule] = await Promise.all([
    prisma.masterAvailabilityOverride.findFirst({ where: { masterId, date } }),
    prisma.masterLocation.findFirst({ where: { masterId, locationId, weekday } }),
  ]);

  if (override?.type === "day_off") return [];

  let ranges: Range[] = [];
  if (schedule) {
    ranges.push([timeToMinutes(schedule.timeFrom), timeToMinutes(schedule.timeTo)]);
  }
  if (override?.type === "extra_slot" && override.timeFrom && override.timeTo) {
    ranges.push([timeToMinutes(override.timeFrom), timeToMinutes(override.timeTo)]);
  }
  if (override?.type === "blocked_range" && override.timeFrom && override.timeTo) {
    ranges = subtractRange(ranges, [timeToMinutes(override.timeFrom), timeToMinutes(override.timeTo)]);
  }
  if (ranges.length === 0) return [];

  const candidates: number[] = [];
  for (const [rangeStart, rangeEnd] of ranges) {
    for (let t = rangeStart; t + durationMinutes <= rangeEnd; t += SLOT_INTERVAL_MINUTES) {
      candidates.push(t);
    }
  }
  if (candidates.length === 0) return [];

  // A master can only be in one place — bookings block across all their locations that day.
  const existingBookings = await prisma.booking.findMany({
    where: { masterId, date, status: { in: ["pending", "confirmed"] } },
    select: { timeFrom: true, timeTo: true },
  });
  const bookedRanges: Range[] = existingBookings.map((b) => [
    timeToMinutes(b.timeFrom),
    timeToMinutes(b.timeTo),
  ]);

  const dateStr = formatDateOnly(date);
  const lockValues =
    candidates.length > 0
      ? await redis.mget(...candidates.map((t) => lockKey(masterId, dateStr, minutesToTime(t))))
      : [];

  const available = candidates.filter((start, i) => {
    const end = start + durationMinutes;
    const overlapsBooking = bookedRanges.some(([bs, be]) => start < be && end > bs);
    if (overlapsBooking) return false;
    if (lockValues[i] && lockValues[i] !== ignoreLockToken) return false;
    return true;
  });

  return available.map(minutesToTime);
}

export class SlotUnavailableError extends Error {}
export class CriticalSectionBusyError extends Error {}

/**
 * Serializes booking creation per (master, day): the 10-minute slot lock is
 * keyed by exact start time, so two requests for different-but-overlapping
 * start times (possible when services have different durations) could both
 * pass the lock check independently. This short critical section closes that
 * gap by re-checking availability and inserting the booking atomically with
 * respect to any other creation attempt for the same master and day.
 */
export async function withMasterDayLock<T>(
  masterId: string,
  date: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `booking:critical:${masterId}:${date}`;
  const token = crypto.randomUUID();

  const acquired = await redis.set(key, token, "EX", 5, "NX");
  if (!acquired) {
    throw new CriticalSectionBusyError();
  }

  try {
    return await fn();
  } finally {
    const releaseIfOwner = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
    await redis.eval(releaseIfOwner, 1, key, token);
  }
}

/** Scans forward day by day for the marketing "next available slot" nudge. */
export async function getNextAvailableSlot({
  masterId,
  locationId,
  durationMinutes,
  fromDate,
  maxDays = 14,
}: {
  masterId: string;
  locationId: string;
  durationMinutes: number;
  fromDate: Date;
  maxDays?: number;
}): Promise<{ date: string; time: string } | null> {
  for (let i = 0; i < maxDays; i++) {
    const date = new Date(fromDate);
    date.setUTCDate(date.getUTCDate() + i);
    const slots = await getAvailableSlots({ masterId, locationId, date, durationMinutes });
    if (slots.length > 0) {
      return { date: formatDateOnly(date), time: slots[0] };
    }
  }
  return null;
}
