import { formatInTimeZone } from "date-fns-tz";
import { parseDateOnly } from "@/lib/booking";

export const SALON_TIMEZONE = "Europe/Kyiv";

/**
 * Today's calendar date in the salon's timezone, as a UTC-midnight Date
 * (matches Booking.date). Deliberately uses `formatInTimeZone` rather than
 * `toZonedTime` — the latter returns a Date meant to be read with *local*
 * (system-timezone) getters, which silently gives the wrong day the moment
 * the server's own timezone isn't Europe/Kyiv (e.g. Railway defaults to UTC).
 */
export function getSalonToday(): Date {
  return parseDateOnly(formatInTimeZone(new Date(), SALON_TIMEZONE, "yyyy-MM-dd"));
}
