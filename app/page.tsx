import { prisma } from "@/lib/prisma";
import { addDays, mondayOf, todayYMD } from "@/lib/dates";
import type { Ingredient, MealDTO, PlannedDTO, PlannedStatus, Slot } from "@/lib/types";
import WeekCalendar from "@/components/WeekCalendar";

export const dynamic = "force-dynamic";

function toMealDTO(m: {
  id: string;
  name: string;
  mealTypes: unknown;
  category: string;
  colorHex: string;
  recipe: string | null;
  ingredients: unknown;
  prepMinutes: number;
  tags: string[];
  isAiGenerated: boolean;
  createdAt: Date;
}): MealDTO {
  return {
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
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(week ?? "") ? week! : todayYMD());
  const weekEnd = addDays(weekStart, 6);

  const [planned, meals] = await Promise.all([
    prisma.plannedMeal.findMany({
      where: {
        date: {
          gte: new Date(weekStart + "T00:00:00Z"),
          lte: new Date(weekEnd + "T00:00:00Z"),
        },
      },
      include: { meal: true },
    }),
    prisma.meal.findMany({ orderBy: { name: "asc" } }),
  ]);

  const plannedDTOs: PlannedDTO[] = planned.map((p) => ({
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    slot: p.slot as Slot,
    locked: p.locked,
    status: p.status as PlannedStatus,
    aiReason: p.aiReason,
    sortOrder: p.sortOrder,
    meal: toMealDTO(p.meal),
  }));

  return (
    <WeekCalendar
      key={weekStart}
      weekStart={weekStart}
      initialPlanned={plannedDTOs}
      library={meals.map(toMealDTO)}
    />
  );
}
