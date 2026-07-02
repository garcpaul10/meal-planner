"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Frequency, MealDTO, Slot } from "@/lib/types";
import { FREQUENCIES, SLOTS } from "@/lib/types";

type Row = {
  name: string;
  mealTypes: Slot[];
  category: string;
  prepMinutes: number;
  frequency: Frequency;
};

const emptyRow = (): Row => ({
  name: "",
  mealTypes: [],
  category: "other",
  prepMinutes: 15,
  frequency: "weekly",
});

const inputCls =
  "rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function SeedForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (created: MealDTO[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 5 }, emptyRow));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function patchRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function toggleSlot(i: number, slot: Slot) {
    setRows((prev) =>
      prev.map((r, j) =>
        j === i
          ? {
              ...r,
              mealTypes: r.mealTypes.includes(slot)
                ? r.mealTypes.filter((s) => s !== slot)
                : [...r.mealTypes, slot],
            }
          : r,
      ),
    );
  }

  async function save() {
    setError("");
    const filled = rows.filter((r) => r.name.trim());
    if (filled.length === 0) return setError("Fill in at least one meal.");
    const missingSlot = filled.find((r) => r.mealTypes.length === 0);
    if (missingSlot)
      return setError(`Pick B/L/D/S for "${missingSlot.name}" so I know when you eat it.`);
    setBusy(true);

    const res = await fetch("/api/meals/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meals: filled.map((r) => ({
          name: r.name.trim(),
          mealTypes: r.mealTypes,
          category: r.category,
          prepMinutes: Number(r.prepMinutes) || 0,
          frequency: r.frequency,
        })),
      }),
    });
    if (res.ok) {
      const created = await res.json();
      onSaved(
        created.map((m: MealDTO & { createdAt: string | Date }) => ({
          ...m,
          ingredients: m.ingredients ?? [],
          createdAt: String(m.createdAt),
        })),
      );
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-8 w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          ⚡ Quick start — the meals you already eat
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          List your regulars: name, which meal it is (B = breakfast, L = lunch, D = dinner, S =
          snack), and roughly how often. Rough guesses are fine — you can edit everything later.
        </p>

        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <input
                value={row.name}
                onChange={(e) => patchRow(i, { name: e.target.value })}
                placeholder={`Meal ${i + 1}`}
                className={`${inputCls} w-44 flex-1`}
              />
              <div className="flex gap-1">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSlot(i, s)}
                    title={s}
                    className={`h-8 w-8 rounded-md border text-xs font-bold ${
                      row.mealTypes.includes(s)
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                    }`}
                  >
                    {s[0]}
                  </button>
                ))}
              </div>
              <select
                value={row.category}
                onChange={(e) => patchRow(i, { category: e.target.value })}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={row.frequency}
                onChange={(e) => patchRow(i, { frequency: e.target.value as Frequency })}
                className={inputCls}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="number"
                  min={0}
                  value={row.prepMinutes}
                  onChange={(e) => patchRow(i, { prepMinutes: Number(e.target.value) })}
                  className={`${inputCls} w-16`}
                />
                min
              </label>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((p) => [...p, emptyRow()])}
          className="mt-2 text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
        >
          + Add another row
        </button>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
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
            {busy ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>
    </div>
  );
}
