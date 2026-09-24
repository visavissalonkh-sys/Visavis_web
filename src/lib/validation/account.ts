import { z } from "zod";

export const accountProfileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Ім'я обов'язкове").max(100),
});

export const addFavoriteSchema = z.object({
  masterId: z.string().uuid(),
});
