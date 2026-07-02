import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultColorFor } from "@/lib/categories";
import { SeedInputSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = SeedInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid seed data" },
      { status: 400 },
    );
  }

  const created = await prisma.meal.createManyAndReturn({
    data: parsed.data.meals.map((m) => ({
      name: m.name,
      mealTypes: m.mealTypes,
      category: m.category,
      colorHex: defaultColorFor(m.category),
      prepMinutes: m.prepMinutes,
      tags: [`freq:${m.frequency}`],
      ingredients: [],
    })),
  });
  return NextResponse.json(created, { status: 201 });
}
