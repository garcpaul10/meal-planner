import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PlannedMealCreateSchema, YMD } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!YMD.safeParse(start).success || !YMD.safeParse(end).success) {
    return NextResponse.json({ error: "start and end (YYYY-MM-DD) required" }, { status: 400 });
  }
  const planned = await prisma.plannedMeal.findMany({
    where: {
      date: { gte: new Date(start + "T00:00:00Z"), lte: new Date(end + "T00:00:00Z") },
    },
    include: { meal: true },
  });
  return NextResponse.json(planned);
}

// Creates a planned meal in a slot. If the slot is occupied, the occupant is
// replaced (dragging a library meal onto a filled cell swaps the meal out).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = PlannedMealCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid planned meal" }, { status: 400 });
  }
  const { date, slot, mealId } = parsed.data;
  const day = new Date(date + "T00:00:00Z");

  const created = await prisma.$transaction(async (tx) => {
    await tx.plannedMeal.deleteMany({ where: { date: day, slot } });
    return tx.plannedMeal.create({
      data: { date: day, slot, mealId },
      include: { meal: true },
    });
  });
  return NextResponse.json(created, { status: 201 });
}
