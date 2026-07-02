import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MealInputSchema } from "@/lib/validation";

export async function GET() {
  const meals = await prisma.meal.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(meals);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = MealInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid meal" },
      { status: 400 },
    );
  }
  const meal = await prisma.meal.create({ data: parsed.data });
  return NextResponse.json(meal, { status: 201 });
}
