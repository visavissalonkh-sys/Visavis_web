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

// Mirrors src/lib/data/services.ts's fixed category list — a service filed
// under any other category would never show up on a public category page.
const SERVICE_CATEGORIES = ["hair", "nails", "cosmetology", "permanent", "massage"] as const;

export const adminServicePriceUpdateSchema = z
  .object({
    priceFrom: z.number().nonnegative(),
    priceTo: z.number().nonnegative().nullable().optional(),
  })
  .refine((v) => v.priceTo == null || v.priceTo >= v.priceFrom, { message: "Ціна «до» не може бути меншою за «від»" });

export const adminServiceInputSchema = z
  .object({
    category: z.enum(SERVICE_CATEGORIES),
    name: z.string().trim().min(1, "Назва обов'язкова").max(150),
    description: z.string().trim().min(1, "Опис обов'язковий").max(1000),
    durationMinutes: z.number().int().min(5).max(600),
    priceFrom: z.number().nonnegative(),
    priceTo: z.number().nonnegative().optional(),
    photoUrls: z.array(z.string().url()).max(10),
    seoSlug: z.string().trim().max(100).optional(),
  })
  .refine((v) => v.priceTo == null || v.priceTo >= v.priceFrom, { message: "Ціна «до» не може бути меншою за «від»" });

export const adminSetActiveSchema = z.object({ isActive: z.boolean() });

const workingHoursDaySchema = z.object({
  isOpen: z.boolean(),
  from: timeOnly.optional(),
  to: timeOnly.optional(),
});

export const workingHoursSchema = z.object({
  mon: workingHoursDaySchema,
  tue: workingHoursDaySchema,
  wed: workingHoursDaySchema,
  thu: workingHoursDaySchema,
  fri: workingHoursDaySchema,
  sat: workingHoursDaySchema,
  sun: workingHoursDaySchema,
});

export const adminLocationInputSchema = z.object({
  name: z.string().trim().min(1, "Назва обов'язкова").max(150),
  address: z.string().trim().min(1, "Адреса обов'язкова").max(300),
  phone: z.string().trim().min(5).max(20),
  workingHours: workingHoursSchema,
  photoUrls: z.array(z.string().url()).max(10),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const adminReviewRejectSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const bookingStatus = z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]);

export const adminAnalyticsQuerySchema = z.object({
  from: dateOnly,
  to: dateOnly,
});

export const adminReportExportSchema = z.object({
  from: dateOnly,
  to: dateOnly,
  masterId: uuid.optional(),
  locationId: uuid.optional(),
  status: bookingStatus.optional(),
});

export const adminBookingStatusSchema = z.object({
  status: bookingStatus,
});

export const adminAuditQuerySchema = z.object({
  actorId: uuid.optional(),
  action: z.string().trim().max(100).optional(),
  dateFrom: dateOnly.optional(),
  dateTo: dateOnly.optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const adminUploadSignatureSchema = z.object({
  purpose: z.enum(["service", "location"]),
});
