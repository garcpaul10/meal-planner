import { z } from "zod";

export const MealSlotEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

export const IngredientSchema = z.object({
  name: z.string().min(1),
  qty: z.number().nonnegative(),
  unit: z.string(),
});

export const MealInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  mealTypes: z.array(MealSlotEnum).min(1, "Pick at least one meal type"),
  category: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  recipe: z.string().max(20000).nullable().optional(),
  ingredients: z.array(IngredientSchema).default([]),
  prepMinutes: z.number().int().min(0).max(600),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

export type MealInput = z.infer<typeof MealInputSchema>;

export const SeedMealSchema = z.object({
  name: z.string().min(1).max(120),
  mealTypes: z.array(MealSlotEnum).min(1),
  category: z.string().min(1),
  prepMinutes: z.number().int().min(0).max(600),
  // Rough eating frequency for AI cold-start, stored as a "freq:*" tag.
  frequency: z.enum(["daily", "few-times-a-week", "weekly", "occasionally"]),
});

export const SeedInputSchema = z.object({
  meals: z.array(SeedMealSchema).min(1).max(50),
});
