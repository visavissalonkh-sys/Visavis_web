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
