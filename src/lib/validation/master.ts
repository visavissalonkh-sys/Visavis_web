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

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Ім'я обов'язкове").max(100),
  bio: z.string().trim().max(500, "Максимум 500 символів").optional(),
  instagramUrl: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^https:\/\/(www\.)?instagram\.com\//.test(v), {
      message: "Посилання має вести на instagram.com",
    })
    .optional(),
  avatarUrl: z.string().url().optional(),
  specialtyServiceIds: z.array(z.string().uuid()).max(50),
});
