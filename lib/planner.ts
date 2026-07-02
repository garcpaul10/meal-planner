import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defaultColorFor } from "@/lib/categories";
import { addDays, mondayOf } from "@/lib/dates";
import type { MealSlot, Prisma } from "@/lib/generated/prisma/client";

// ---------- Plan schema (what Claude must return) ----------

const SlotPlanSchema = z.object({
  mealName: z.string(),
  existingMealId: z.string().nullable(),
  aiReason: z.string(),
  newMealDetails: z
    .object({
      category: z.string(),
      prepMinutes: z.number().int(),
      ingredients: z.array(
        z.object({ name: z.string(), qty: z.number(), unit: z.string() }),
      ),
      recipe: z.string(),
      tags: z.array(z.string()),
    })
    .nullable(),
});

const PlanSchema = z.object({
  days: z.array(
    z.object({
      date: z.string(),
      slots: z.object({
        breakfast: SlotPlanSchema,
        lunch: SlotPlanSchema,
        dinner: SlotPlanSchema,
        snack: SlotPlanSchema,
      }),
    }),
  ),
});

export type Plan = z.infer<typeof PlanSchema>;
type SlotPlan = z.infer<typeof SlotPlanSchema>;

// JSON Schema for the API's structured-output format (hand-written: keeps us
// independent of zod-version-specific SDK helpers).
const PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["days"],
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "slots"],
        properties: {
          date: { type: "string" },
          slots: {
            type: "object",
            additionalProperties: false,
            required: ["breakfast", "lunch", "dinner", "snack"],
            properties: Object.fromEntries(
              ["breakfast", "lunch", "dinner", "snack"].map((s) => [
                s,
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["mealName", "existingMealId", "aiReason", "newMealDetails"],
                  properties: {
                    mealName: { type: "string" },
                    existingMealId: { type: ["string", "null"] },
                    aiReason: { type: "string" },
                    newMealDetails: {
                      anyOf: [
                        { type: "null" },
                        {
                          type: "object",
                          additionalProperties: false,
                          required: ["category", "prepMinutes", "ingredients", "recipe", "tags"],
                          properties: {
                            category: { type: "string" },
                            prepMinutes: { type: "integer" },
                            ingredients: {
                              type: "array",
                              items: {
                                type: "object",
                                additionalProperties: false,
                                required: ["name", "qty", "unit"],
                                properties: {
                                  name: { type: "string" },
                                  qty: { type: "number" },
                                  unit: { type: "string" },
                                },
                              },
                            },
                            recipe: { type: "string" },
                            tags: { type: "array", items: { type: "string" } },
                          },
                        },
                      ],
                    },
                  },
                },
              ]),
            ),
          },
        },
      },
    },
  },
} as const;

// ---------- Prompt building ----------

const SLOT_KEYS = ["breakfast", "lunch", "dinner", "snack"] as const;
const SLOT_ENUM: Record<(typeof SLOT_KEYS)[number], MealSlot> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
  snack: "SNACK",
};

type Prefs = {
  maxWeekdayPrepMinutes: string;
  noRepeatDays: string;
  maxNewMealsPerWeek: string;
  dietaryRules: string;
  freeTextPreferences: string;
};

const PREF_DEFAULTS: Prefs = {
  maxWeekdayPrepMinutes: "45",
  noRepeatDays: "5",
  maxNewMealsPerWeek: "2",
  dietaryRules: "none",
  freeTextPreferences: "none",
};

async function loadPrefs(): Promise<Prefs> {
  const rows = await prisma.preference.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...PREF_DEFAULTS, ...map };
}

function loadTemplate(): { system: string; user: string; reroll: string } {
  const raw = fs.readFileSync(path.join(process.cwd(), "prompts", "plan-week.md"), "utf8");
  const system = raw.split("## SYSTEM PROMPT")[1].split("## USER PROMPT")[0].trim();
  const user = raw.split("## USER PROMPT")[1].split("## REROLL PROMPT")[0].trim();
  const reroll = raw.split("## REROLL PROMPT")[1].trim();
  return { system, user, reroll };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function buildContext(weekStart: string, usePantry: boolean) {
  const weekEnd = addDays(weekStart, 6);
  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 86400_000);
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 86400_000);

  const [meals, eaten, recent, pantry, lockedRows, prefs] = await Promise.all([
    prisma.meal.findMany({ orderBy: { name: "asc" } }),
    prisma.plannedMeal.groupBy({
      by: ["mealId"],
      where: { status: "EATEN", date: { gte: ninetyDaysAgo } },
      _count: { mealId: true },
    }),
    prisma.plannedMeal.findMany({
      where: { date: { gte: fourteenDaysAgo, lt: new Date(weekStart + "T00:00:00Z") } },
      include: { meal: true },
      orderBy: { date: "asc" },
    }),
    usePantry ? prisma.pantryItem.findMany({ orderBy: { expiryDate: "asc" } }) : Promise.resolve([]),
    prisma.plannedMeal.findMany({
      where: {
        locked: true,
        date: { gte: new Date(weekStart + "T00:00:00Z"), lte: new Date(weekEnd + "T00:00:00Z") },
      },
      include: { meal: true },
    }),
    loadPrefs(),
  ]);

  const eatenCount = Object.fromEntries(eaten.map((e) => [e.mealId, e._count.mealId]));

  const frequentMeals =
    meals
      .slice(0, 40)
      .map((m) => {
        const freqTag = m.tags.find((t) => t.startsWith("freq:"));
        const eatenPart = eatenCount[m.id] ? `eaten ${eatenCount[m.id]}x` : (freqTag ?? "freq:unknown");
        const otherTags = m.tags.filter((t) => !t.startsWith("freq:"));
        return `id=${m.id} | ${m.name} | slots: ${(m.mealTypes as MealSlot[]).join("/")} | ${eatenPart} | prep ${m.prepMinutes}m | category: ${m.category}${otherTags.length ? ` | tags: ${otherTags.join(",")}` : ""}`;
      })
      .join("\n") || "(library is empty)";

  const recentHistory =
    recent
      .map((p) => `${p.date.toISOString().slice(0, 10)} ${p.slot}: ${p.meal.name} (${p.status})`)
      .join("\n") || "(no recent history)";

  const sevenDaysOut = new Date(today.getTime() + 7 * 86400_000);
  const pantryItems = usePantry
    ? pantry
        .map((p) => {
          const exp = p.expiryDate
            ? `, expires ${p.expiryDate.toISOString().slice(0, 10)}${p.expiryDate <= sevenDaysOut ? " (EXPIRING SOON)" : ""}`
            : "";
          return `${p.name}, ${p.quantity} ${p.unit}${exp}`;
        })
        .join("\n") || "(pantry is empty)"
    : "(pantry not in use this week — ignore pantry entirely)";

  const lockedSlots =
    lockedRows
      .map((p) => `${p.date.toISOString().slice(0, 10)} ${p.slot}: mealId=${p.mealId} ${p.meal.name}`)
      .join("\n") || "(none)";

  const vars: Record<string, string> = {
    ...prefs,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    frequentMeals,
    recentHistory,
    pantryItems,
    lockedSlots,
    pantryPrinciple: usePantry
      ? "Prioritize pantry items expiring within 7 days — schedule them early in the week and note it in aiReason."
      : "The pantry is NOT in use this week. Do not plan around pantry contents.",
    newMealPantryClause: usePantry ? " and use pantry items where possible" : "",
  };

  const tpl = loadTemplate();
  return {
    system: fill(tpl.system, vars),
    user: fill(tpl.user, vars),
    rerollTpl: tpl.reroll,
    vars,
    meals,
    lockedRows,
  };
}

// ---------- Claude call ----------

const MODEL = "claude-sonnet-5";

async function callClaude(system: string, user: string): Promise<Plan> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  async function attempt(extra: string): Promise<Plan> {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      output_config: {
        format: { type: "json_schema", schema: PLAN_JSON_SCHEMA },
      },
      messages: [{ role: "user", content: user + extra }],
    });
    if (response.stop_reason === "refusal") {
      throw new Error("The AI declined this request.");
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const cleaned = text.replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "");
    const parsed = PlanSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) throw new Error("Plan did not match the expected structure.");
    return parsed.data;
  }

  try {
    return await attempt("");
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error(
        "The AI isn't connected yet — the ANTHROPIC_API_KEY setting needs a real key.",
      );
    }
    if (err instanceof Anthropic.APIError) throw err; // don't retry rate/server errors blindly
    return attempt("\n\nYour previous response was invalid. Return only the JSON object matching the schema.");
  }
}

// ---------- Applying a plan ----------

async function applySlot(
  tx: Prisma.TransactionClient,
  date: string,
  slot: MealSlot,
  plan: SlotPlan,
  mealIds: Set<string>,
) {
  const day = new Date(date + "T00:00:00Z");

  let mealId = plan.existingMealId && mealIds.has(plan.existingMealId) ? plan.existingMealId : null;

  if (!mealId) {
    const details = plan.newMealDetails;
    const category = details?.category ?? "other";
    const created = await tx.meal.create({
      data: {
        name: plan.mealName,
        mealTypes: [slot],
        category,
        colorHex: defaultColorFor(category),
        recipe: details?.recipe || null,
        ingredients: details?.ingredients ?? [],
        prepMinutes: details?.prepMinutes ?? 0,
        tags: details?.tags ?? [],
        isAiGenerated: true,
      },
    });
    mealId = created.id;
  }

  await tx.plannedMeal.deleteMany({ where: { date: day, slot, locked: false } });
  return tx.plannedMeal.create({
    data: { date: day, slot, mealId, aiReason: plan.aiReason },
    include: { meal: true },
  });
}

export async function planWeek(weekStart: string, usePantry: boolean) {
  const ctx = await buildContext(weekStart, usePantry);
  if (ctx.meals.length === 0) {
    throw new Error("Add some meals to your library first — the AI plans from your regular meals.");
  }
  const plan = await callClaude(ctx.system, ctx.user);

  const mealIds = new Set(ctx.meals.map((m) => m.id));
  const lockedCells = new Set(
    ctx.lockedRows.map((p) => `${p.date.toISOString().slice(0, 10)}|${p.slot}`),
  );
  const validDates = new Set(Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)));

  return prisma.$transaction(
    async (tx) => {
      const created = [];
      for (const day of plan.days) {
        if (!validDates.has(day.date)) continue;
        for (const key of SLOT_KEYS) {
          const slot = SLOT_ENUM[key];
          if (lockedCells.has(`${day.date}|${slot}`)) continue;
          created.push(await applySlot(tx, day.date, slot, day.slots[key], mealIds));
        }
      }
      return created;
    },
    { timeout: 30000 },
  );
}

export async function rerollSlot(date: string, slot: MealSlot) {
  const weekStart = mondayOf(date);
  const ctx = await buildContext(weekStart, false);

  const weekEnd = addDays(weekStart, 6);
  const weekRows = await prisma.plannedMeal.findMany({
    where: {
      date: { gte: new Date(weekStart + "T00:00:00Z"), lte: new Date(weekEnd + "T00:00:00Z") },
    },
    include: { meal: true },
    orderBy: { date: "asc" },
  });
  const current = weekRows.find(
    (p) => p.date.toISOString().slice(0, 10) === date && p.slot === slot,
  );

  const rerollUser = fill(ctx.rerollTpl, {
    date,
    slot,
    currentMealName: current?.meal.name ?? "(empty)",
    currentWeekPlan:
      weekRows
        .map((p) => `${p.date.toISOString().slice(0, 10)} ${p.slot}: ${p.meal.name}${p.locked ? " (LOCKED)" : ""}`)
        .join("\n") || "(empty week)",
  });

  const plan = await callClaude(ctx.system, ctx.user + "\n\n" + rerollUser);

  const slotKey = slot.toLowerCase() as (typeof SLOT_KEYS)[number];
  const slotPlan = plan.days[0]?.slots[slotKey];
  if (!slotPlan) throw new Error("The AI did not return a replacement for that slot.");

  const mealIds = new Set(ctx.meals.map((m) => m.id));
  return prisma.$transaction(
    async (tx) => applySlot(tx, date, slot, slotPlan, mealIds),
    { timeout: 30000 },
  );
}
