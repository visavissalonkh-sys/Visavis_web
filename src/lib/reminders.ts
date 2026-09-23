import { fromZonedTime } from "date-fns-tz";
import { redis } from "@/lib/redis";
import { formatDateOnly } from "@/lib/booking";

const REMINDERS_ZSET = "reminders";
const SALON_TIMEZONE = "Europe/Kyiv";

/** The real UTC instant a "YYYY-MM-DD" + "HH:MM" booking slot refers to, in the salon's timezone. */
export function visitStartsAt(date: Date, timeFrom: string): Date {
  return fromZonedTime(`${formatDateOnly(date)} ${timeFrom}:00`, SALON_TIMEZONE);
}

/**
 * Queues the 24h/2h reminders for a booking into a Redis sorted set (score =
 * unix ms when due). A worker polls `ZRANGEBYSCORE reminders 0 <now>` and pops
 * due entries — see Visavis_bot for the consumer (Stage 2, reminders worker).
 */
export async function scheduleReminders(bookingId: string, visitAt: Date): Promise<void> {
  const now = Date.now();
  const in24h = visitAt.getTime() - 24 * 60 * 60 * 1000;
  const in2h = visitAt.getTime() - 2 * 60 * 60 * 1000;

  const entries: [number, string][] = [];
  if (in24h > now) entries.push([in24h, `reminder_24h:${bookingId}`]);
  if (in2h > now) entries.push([in2h, `reminder_2h:${bookingId}`]);
  if (entries.length === 0) return;

  await redis.zadd(REMINDERS_ZSET, ...entries.flatMap(([score, member]) => [score, member]));
}

export async function cancelReminders(bookingId: string): Promise<void> {
  await redis.zrem(REMINDERS_ZSET, `reminder_24h:${bookingId}`, `reminder_2h:${bookingId}`);
}
