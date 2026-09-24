import { z } from "zod";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Невірний формат часу");

export const regularScheduleSchema = z.object({
  locationId: z.string().uuid(),
  schedule: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        isWorking: z.boolean(),
        timeFrom: timeString.optional(),
        timeTo: timeString.optional(),
      }),
    )
    .length(7, "Потрібен розклад для всіх 7 днів тижня"),
});

export const overrideCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невірний формат дати"),
  type: z.enum(["day_off", "extra_slot", "blocked_range"]),
  timeFrom: timeString.optional(),
  timeTo: timeString.optional(),
  note: z.string().trim().max(200).optional(),
});
