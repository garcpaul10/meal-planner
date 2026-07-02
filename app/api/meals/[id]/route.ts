import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MealInputSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = MealInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid meal" },
      { status: 400 },
    );
  }
  try {
    const meal = await prisma.meal.update({ where: { id }, data: parsed.data });
    return NextResponse.json(meal);
  } catch {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.meal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }
}
