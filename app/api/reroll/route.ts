import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rerollSlot } from "@/lib/planner";
import { MealSlotEnum, YMD } from "@/lib/validation";

export const maxDuration = 120;

const BodySchema = z.object({ date: YMD, slot: MealSlotEnum });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const created = await rerollSlot(parsed.data.date, parsed.data.slot);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("reroll failed:", err);
    const message = err instanceof Error ? err.message : "Reroll failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
