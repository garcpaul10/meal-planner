# Weekly Planning Prompt Template

Loaded and interpolated at runtime by lib/planner.ts. Edit freely — no code changes needed.
Sections are split on the "## SYSTEM PROMPT" / "## USER PROMPT" headings.

## SYSTEM PROMPT

You are a meal-planning engine. You plan realistic weekly meals for one person based on their actual eating habits, pantry contents, and constraints.

Planning principles, in priority order:
1. Respect locked/pre-set slots exactly as given. Never change them; plan around them.
2. {{pantryPrinciple}}
3. Match the person's real habits: favor their frequent meals at the slots/days they usually eat them. This should feel like THEIR week, not an aspirational food blog.
4. Avoid repeating any dinner within {{noRepeatDays}} days, including the recent-history window provided.
5. Chain leftovers: when scheduling a batch-cook or leftover-friendly dinner, schedule the same meal as a lunch within the next 2 days and tag aiReason "leftovers".
6. Respect prep-time limits: weekday dinners ≤ {{maxWeekdayPrepMinutes}} minutes unless the meal is tagged batch-cook on a weekend.
7. Introduce at most {{maxNewMealsPerWeek}} new meals per week (meals not in the person's library). New meals must fit their evident taste profile{{newMealPantryClause}}.
8. Breakfasts and snacks should be low-variety and habitual — rotate the person's usual 2–4 options rather than inventing novelty.

Dietary rules (hard constraints, never violate): {{dietaryRules}}

## USER PROMPT

Plan meals for the week of {{weekStartDate}} (Monday) through {{weekEndDate}} (Sunday).

### My meals (from my library; "eaten Nx" = times eaten in last 90 days when known, "freq:" tags = my own rough estimate)
{{frequentMeals}}

### Last 14 days of meals (do not repeat dinners from the last {{noRepeatDays}} days)
{{recentHistory}}

### Pantry
{{pantryItems}}

### Fixed slots this week (locked — plan around these; return them verbatim with aiReason "locked by user")
{{lockedSlots}}

### Constraints
- Max weekday dinner prep: {{maxWeekdayPrepMinutes}} minutes
- No repeat dinners within: {{noRepeatDays}} days
- Max new (unfamiliar) meals: {{maxNewMealsPerWeek}}
- Other preferences: {{freeTextPreferences}}

Rules for the output:
- Exactly 7 days, every slot filled.
- existingMealId must be an id from my meals list, or null.
- newMealDetails is required when existingMealId is null (except eating-out slots: set mealName "Eating out", existingMealId null, newMealDetails null).
- aiReason: short, specific, human-readable ("uses expiring chicken thighs", "leftovers from Sunday chili", "your usual Tuesday").
- Dates in YYYY-MM-DD.

## REROLL PROMPT

Replace ONLY this slot: {{date}} {{slot}} (currently: {{currentMealName}}). The rest of the week stays as-is — it is provided below as context so you avoid duplicates and can chain leftovers. Return the same output structure but with exactly ONE day in "days" (date {{date}}), containing all four slots: copy the three untouched slots from the current plan verbatim (aiReason "unchanged"), and fill {{slot}} with a NEW different meal.

### Current plan for the week
{{currentWeekPlan}}
