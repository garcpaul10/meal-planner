"use client";

import { useState } from "react";
import { CATEGORIES, defaultColorFor } from "@/lib/categories";
import type { Ingredient, MealDTO, Slot } from "@/lib/types";
import { SLOTS, SLOT_LABELS } from "@/lib/types";

const inputCls =
  "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function MealForm({
  meal,
  onClose,
  onSaved,
}: {
  meal: MealDTO | null;
  onClose: () => void;
  onSaved: (meal: MealDTO) => void;
}) {
  const [name, setName] = useState(meal?.name ?? "");
  const [mealTypes, setMealTypes] = useState<Slot[]>(meal?.mealTypes ?? []);
  const [category, setCategory] = useState(meal?.category ?? "other");
  const [colorHex, setColorHex] = useState(meal?.colorHex ?? defaultColorFor("other"));
  const [colorTouched, setColorTouched] = useState(!!meal);
  const [prepMinutes, setPrepMinutes] = useState(meal?.prepMinutes ?? 15);
  const [tags, setTags] = useState(meal?.tags.join(", ") ?? "");
  const [recipe, setRecipe] = useState(meal?.recipe ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(meal?.ingredients ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleSlot(slot: Slot) {
    setMealTypes((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  }

  function pickCategory(c: string) {
    setCategory(c);
    if (!colorTouched) setColorHex(defaultColorFor(c));
  }

  function setIngredient(i: number, patch: Partial<Ingredient>) {
    setIngredients((prev) => prev.map((ing, j) => (j === i ? { ...ing, ...patch } : ing)));
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Give the meal a name.");
    if (mealTypes.length === 0) return setError("Pick at least one meal type.");
    setBusy(true);

    const payload = {
      name: name.trim(),
      mealTypes,
      category,
      colorHex,
      prepMinutes: Number(prepMinutes) || 0,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      recipe: recipe.trim() || null,
      ingredients: ingredients.filter((i) => i.name.trim()),
    };

    const res = await fetch(meal ? `/api/meals/${meal.id}` : "/api/meals", {
      method: meal ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const saved = await res.json();
      onSaved({ ...saved, createdAt: saved.createdAt ?? new Date().toISOString() });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-8 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {meal ? "Edit meal" : "Add a meal"}
        </h2>

        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meal name (e.g. Chicken tacos)"
            autoFocus
            className={inputCls}
          />

          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">Fits which meals?</p>
            <div className="flex gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSlot(s)}
                  className={`rounded-lg border px-2.5 py-1 text-sm ${
                    mealTypes.includes(s)
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {SLOT_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Category
              <select
                value={category}
                onChange={(e) => pickCategory(e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Color
              <input
                type="color"
                value={colorHex}
                onChange={(e) => {
                  setColorHex(e.target.value);
                  setColorTouched(true);
                }}
                className="h-9 w-14 cursor-pointer rounded-lg border border-zinc-300 bg-white dark:border-zinc-700"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Prep minutes
              <input
                type="number"
                min={0}
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(Number(e.target.value))}
                className={`${inputCls} w-24`}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Tags (separate with commas — e.g. quick, leftover-friendly, batch-cook)
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-500">Ingredients (optional)</p>
              <button
                type="button"
                onClick={() => setIngredients((p) => [...p, { name: "", qty: 1, unit: "" }])}
                className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
              >
                + Add ingredient
              </button>
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} className="mb-1.5 flex gap-1.5">
                <input
                  value={ing.name}
                  onChange={(e) => setIngredient(i, { name: e.target.value })}
                  placeholder="Ingredient"
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={ing.qty}
                  onChange={(e) => setIngredient(i, { qty: Number(e.target.value) })}
                  className={`${inputCls} w-20`}
                />
                <input
                  value={ing.unit}
                  onChange={(e) => setIngredient(i, { unit: e.target.value })}
                  placeholder="unit"
                  className={`${inputCls} w-20`}
                />
                <button
                  type="button"
                  onClick={() => setIngredients((p) => p.filter((_, j) => j !== i))}
                  className="px-1 text-zinc-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Recipe / notes (optional)
            <textarea
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              rows={4}
              className={inputCls}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {busy ? "Saving…" : "Save meal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
