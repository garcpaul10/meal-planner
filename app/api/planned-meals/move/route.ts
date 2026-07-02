import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PlannedMealMoveSchema } from "@/lib/validation";

// Moves a planned meal to another slot/day. If the target is occupied, the
// two meals swap places. Returns both affected rows.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = PlannedMealMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid move" }, { status: 400 });
  }
  const { id, date, slot } = parsed.data;
  const targetDate = new Date(date + "T00:00:00Z");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.plannedMeal.findUniqueOrThrow({ where: { id } });
      const occupant = await tx.plannedMeal.findFirst({
        where: { date: targetDate, slot, NOT: { id } },
      });
      if (occupant) {
        await tx.plannedMeal.update({
          where: { id: occupant.id },
          data: { date: source.date, slot: source.slot },
        });
      }
      await tx.plannedMeal.update({
        where: { id },
        data: { date: targetDate, slot },
      });
      return tx.plannedMeal.findMany({
        where: { id: { in: occupant ? [id, occupant.id] : [id] } },
        include: { meal: true },
      });
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
