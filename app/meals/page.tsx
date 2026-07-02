import { prisma } from "@/lib/prisma";
import type { Ingredient, MealDTO, Slot } from "@/lib/types";
import MealLibrary from "@/components/MealLibrary";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const meals = await prisma.meal.findMany({ orderBy: { name: "asc" } });

  const dtos: MealDTO[] = meals.map((m) => ({
    id: m.id,
    name: m.name,
    mealTypes: m.mealTypes as Slot[],
    category: m.category,
    colorHex: m.colorHex,
    recipe: m.recipe,
    ingredients: (m.ingredients as Ingredient[] | null) ?? [],
    prepMinutes: m.prepMinutes,
    tags: m.tags,
    isAiGenerated: m.isAiGenerated,
    createdAt: m.createdAt.toISOString(),
  }));

  return <MealLibrary initialMeals={dtos} />;
}
