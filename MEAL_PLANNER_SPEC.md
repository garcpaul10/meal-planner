# AI Meal Planner — Project Spec

Personal-use meal planning app. AI generates a rolling weekly plan from my eating habits and pantry contents, displayed in a drag-and-drop calendar.

## Stack
- **Next.js 14+ (App Router), TypeScript** — deployed on **Vercel**
- **Postgres on Railway**, accessed via **Prisma**
- **Tailwind CSS** for styling
- **@dnd-kit/core** for drag-and-drop
- **Anthropic API** (claude-sonnet, structured JSON output) for plan generation
- **GitHub** repo, auto-deploy to Vercel on push to main
- Single user: protect with one env-var passcode (`APP_PASSCODE`) checked in middleware. No accounts.

## Environment variables
- `DATABASE_URL` (Railway Postgres)
- `ANTHROPIC_API_KEY`
- `APP_PASSCODE`

## Data model (Prisma)
- **Meal**: id, name, mealTypes (B/L/D/S it fits), category (protein-heavy, pasta, soup, takeout, etc.), colorHex, recipe (markdown, optional), ingredients (JSON: name, qty, unit), prepMinutes, tags (string[]: "quick", "leftover-friendly", "batch-cook"), isAiGenerated (bool), createdAt
- **PlannedMeal**: id, date, slot (BREAKFAST|LUNCH|DINNER|SNACK), mealId, locked (bool), status (PLANNED|EATEN|SKIPPED|EATING_OUT), aiReason (string, e.g. "uses expiring chicken"), sortOrder
- **PantryItem**: id, name, quantity, unit, expiryDate (optional), addedAt
- **ShoppingListItem**: id, name, quantity, unit, weekStart, checked (bool), aisle (optional)
- **Preference**: key/value store for constraints (max weekday prep minutes, dietary rules, "no repeat dinners within N days", budget notes)

Meal history = PlannedMeals with status EATEN. Frequency stats are computed from this.

## Core features

### 1. Calendar
- **Week view (primary)**: 7 columns × 4 rows (Breakfast, Lunch, Dinner, Snack). Each cell shows a meal card: name, color chip (by category), lock icon toggle, prep time.
- **Month view (overview)**: compact — 4 small color bars per day; click a day to open it in week view. Future unconfirmed weeks render at reduced opacity as "preview".
- **Drag-and-drop** (dnd-kit): move card to another slot/day; dropping on an occupied slot swaps; drag from a sidebar Meal Library onto any slot; drag to a "remove" zone. Persist immediately via API.
- Cell click → detail panel: recipe, ingredients, swap meal, mark eaten/skipped/eating-out, lock/unlock, "reroll this slot" (single-slot AI regeneration).

### 2. AI weekly planning
- Button: "Plan next week" (later: Railway cron hitting the same endpoint Sunday 6pm).
- API route builds a prompt containing:
  - Top ~30 meals by eaten-frequency with counts and typical slots/days
  - Last 14 days of planned meals (avoid repeats)
  - Pantry items, flagging anything expiring within 7 days
  - Preferences/constraints
  - Locked or pre-set slots for the target week (plan around them)
- Claude must return **strict JSON only** (no prose): `{ days: [{ date, slots: { breakfast: {...}, lunch, dinner, snack } }] }` where each slot has `mealName`, `existingMealId?` (null → create new Meal), `aiReason`, `newMealDetails?` (ingredients, prepMinutes, category, recipe) when new.
- Parse defensively: strip code fences, validate with zod, retry once on parse failure.
- Leftover chaining: prompt instructs the model to schedule batch-cook dinners followed by leftover lunches, tagged in aiReason.

### 3. Pantry
- Simple CRUD list with quantity and optional expiry. Quick-add input at top.
- "Expiring soon" badge (≤3 days). Planner prompt prioritizes these.

### 4. Shopping list
- "Generate list" for a planned week: union of ingredients minus pantry stock (fuzzy name match is fine — normalize lowercase/singular).
- Checkboxes; checking an item optionally adds it to pantry.

### 5. Meal library
- CRUD for meals; filter by type/category/tag; used as drag source in calendar sidebar.
- Onboarding seed: a form to quickly enter ~10–15 meals I already eat regularly (name, slot, rough frequency) so the AI has cold-start data.

## UI notes
- Color coding by **category** (position already conveys slot). Legend in sidebar. Assign a default palette, editable per category.
- Clean, dense layout; the week grid is the home page. Keyboard: arrow keys move selection, L toggles lock.
- Mobile: week view becomes vertically stacked day cards; month view shows colored dots.

## Build order
1. Scaffold Next.js + Prisma + Railway Postgres, deploy pipeline working end-to-end (hello world on Vercel).
2. Meal library CRUD + seed form.
3. Week calendar grid with drag-and-drop and persistence.
4. AI planning endpoint + "Plan next week" + single-slot reroll.
5. Pantry CRUD, wire into planning prompt.
6. Shopping list generation.
7. Month view, then polish (locks, statuses, keyboard, mobile).
