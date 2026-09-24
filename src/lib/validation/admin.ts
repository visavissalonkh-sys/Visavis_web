import { z } from "zod";

const uuid = z.string().uuid("Невірний ідентифікатор");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невірний формат дати");
const timeOnly = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Невірний формат часу");

export const adminCreateBookingSchema = z.object({
  clientPhone: z.string().min(5).max(20),
  clientName: z.string().trim().max(100).optional(),
  serviceId: uuid,
  masterId: uuid,
  locationId: uuid,
  date: dateOnly,
  timeFrom: timeOnly,
  comment: z.string().trim().max(500).optional(),
});

export const adminBookingsListQuerySchema = z.object({
  dateFrom: dateOnly.optional(),
  dateTo: dateOnly.optional(),
  masterId: uuid.optional(),
  locationId: uuid.optional(),
  // multi-select statuses arrive as a comma-separated query param
  status: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(["date", "client", "master", "service", "location", "status"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

const scheduleDaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  isWorking: z.boolean(),
  timeFrom: timeOnly.optional(),
  timeTo: timeOnly.optional(),
});

export const masterScheduleInputSchema = z.object({
  locationId: uuid,
  schedule: z.array(scheduleDaySchema).length(7, "Потрібен розклад для всіх 7 днів тижня"),
});

export const adminCreateMasterSchema = z.object({
  name: z.string().trim().min(1, "Ім'я обов'язкове").max(100),
  phone: z.string().min(5).max(20),
  bio: z.string().trim().max(500).optional(),
  instagramUrl: z.string().trim().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  specialtyServiceIds: z.array(uuid).max(50),
  schedules: z.array(masterScheduleInputSchema).max(10),
});

export const adminUpdateMasterSchema = z.object({
  name: z.string().trim().min(1, "Ім'я обов'язкове").max(100),
  bio: z.string().trim().max(500).optional(),
  instagramUrl: z.string().trim().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  specialtyServiceIds: z.array(uuid).max(50),
  schedules: z.array(masterScheduleInputSchema).max(10),
});

export const deactivateMasterSchema = z.object({
  cancelActiveBookings: z.boolean(),
});

export const reauthVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Код має складатись з 6 цифр"),
});
