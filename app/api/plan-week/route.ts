import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { planWeek } from "@/lib/planner";
import { YMD } from "@/lib/validation";

export const maxDuration = 120;

const BodySchema = z.object({ weekStart: YMD, usePantry: z.boolean().default(false) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const created = await planWeek(parsed.data.weekStart, parsed.data.usePantry);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("plan-week failed:", err);
    const message = err instanceof Error ? err.message : "Planning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
