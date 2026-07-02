export type Slot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export const SLOTS: Slot[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export const SLOT_LABELS: Record<Slot, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

export type Ingredient = { name: string; qty: number; unit: string };

export type MealDTO = {
  id: string;
  name: string;
  mealTypes: Slot[];
  category: string;
  colorHex: string;
  recipe: string | null;
  ingredients: Ingredient[];
  prepMinutes: number;
  tags: string[];
  isAiGenerated: boolean;
  createdAt: string;
};

export const FREQUENCIES = [
  { value: "daily", label: "Every day" },
  { value: "few-times-a-week", label: "A few times a week" },
  { value: "weekly", label: "About once a week" },
  { value: "occasionally", label: "Occasionally" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];
