import { z } from "zod";
import { phoneSchema } from "@/lib/validation/auth";

const uuid = z.string().uuid("Невірний ідентифікатор");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невірний формат дати");
const timeOnly = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Невірний формат часу");

export const availabilityQuerySchema = z.object({
  masterId: uuid,
  locationId: uuid,
  serviceId: uuid,
  date: dateOnly,
});

export const lockSlotSchema = z.object({
  masterId: uuid,
  locationId: uuid,
  serviceId: uuid,
  date: dateOnly,
  timeFrom: timeOnly,
});

export const createBookingSchema = z.object({
  serviceId: uuid,
  masterId: uuid,
  locationId: uuid,
  date: dateOnly,
  timeFrom: timeOnly,
  lockToken: z.string().min(1),
  comment: z.string().trim().max(500).optional(),
});

export const guestBookingSchema = z.object({
  serviceId: uuid,
  masterId: uuid,
  locationId: uuid,
  date: dateOnly,
  timeFrom: timeOnly,
  lockToken: z.string().min(1),
  guestName: z.string().trim().min(2, "Мінімум 2 символи").max(100, "Максимум 100 символів"),
  guestPhone: phoneSchema,
  comment: z.string().trim().max(500).optional(),
  // Honeypot — invisible to real users (see GuestBookingForm), always empty
  // for them. A bot's autofill tends to fill every field it can find, so a
  // non-empty value here is treated as spam without telling the caller why.
  website: z.string().max(200).optional().default(""),
});
