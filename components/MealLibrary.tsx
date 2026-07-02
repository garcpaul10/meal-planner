"use client";

import { useMemo, useState } from "react";
import type { MealDTO, Slot } from "@/lib/types";
import { SLOTS, SLOT_LABELS } from "@/lib/types";
import MealForm from "@/components/MealForm";
import SeedForm from "@/components/SeedForm";

export default function MealLibrary({ initialMeals }: { initialMeals: MealDTO[] }) {
  const [meals, setMeals] = useState(initialMeals);
  const [slotFilter, setSlotFilter] = useState<Slot | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MealDTO | "new" | null>(null);
  const [seeding, setSeeding] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(meals.map((m) => m.category))).sort(),
    [meals],
  );

  const visible = meals.filter((m) => {
    if (slotFilter !== "ALL" && !m.mealTypes.includes(slotFilter)) return false;
    if (categoryFilter !== "ALL" && m.category !== categoryFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !m.name.toLowerCase().includes(q) && !m.tags.some((t) => t.toLowerCase().includes(q)))
      return false;
    return true;
  });

  function upsertLocal(meal: MealDTO) {
    setMeals((prev) => {
      const i = prev.findIndex((m) => m.id === meal.id);
      const next = i === -1 ? [...prev, meal] : prev.map((m) => (m.id === meal.id ? meal : m));
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function remove(meal: MealDTO) {
    if (!confirm(`Delete "${meal.name}"?`)) return;
    const res = await fetch(`/api/meals/${meal.id}`, { method: "DELETE" });
    if (res.ok) setMeals((prev) => prev.filter((m) => m.id !== meal.id));
    else alert("Could not delete that meal — please try again.");
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 font-sans">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Meal Library</h1>
        <span className="text-sm text-zinc-500">{meals.length} meals</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setSeeding(true)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ⚡ Quick start
          </button>
          <button
            onClick={() => setEditing("new")}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Add meal
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search meals or tags…"
          className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select
          value={slotFilter}
          onChange={(e) => setSlotFilter(e.target.value as Slot | "ALL")}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="ALL">Any meal type</option>
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {SLOT_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="ALL">Any category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {meals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-1 text-lg font-medium text-zinc-800 dark:text-zinc-200">
            No meals yet
          </p>
          <p className="mb-4 text-sm text-zinc-500">
            Use <strong>⚡ Quick start</strong> to enter the 10–15 meals you eat most often —
            it takes about two minutes and gives the AI planner something to work with.
          </p>
          <button
            onClick={() => setSeeding(true)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            ⚡ Quick start
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          No meals match those filters.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((meal) => (
            <li
              key={meal.id}
              className="group rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meal.colorHex }}
                />
                <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {meal.name}
                </span>
                <div className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setEditing(meal)}
                    className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(meal)}
                    className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  {meal.category}
                </span>
                {meal.mealTypes.map((s) => (
                  <span key={s} className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                    {SLOT_LABELS[s]}
                  </span>
                ))}
                {meal.prepMinutes > 0 && <span>⏱ {meal.prepMinutes}m</span>}
                {meal.tags
                  .filter((t) => !t.startsWith("freq:"))
                  .map((t) => (
                    <span key={t} className="text-zinc-400">
                      #{t}
                    </span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MealForm
          meal={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            upsertLocal(m);
            setEditing(null);
          }}
        />
      )}
      {seeding && (
        <SeedForm
          onClose={() => setSeeding(false)}
          onSaved={(created) => {
            created.forEach(upsertLocal);
            setSeeding(false);
          }}
        />
      )}
    </main>
  );
}
