"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, fmtWeekRange, todayYMD } from "@/lib/dates";
import type { MealDTO, PlannedDTO, Slot } from "@/lib/types";
import { SLOTS, SLOT_LABELS } from "@/lib/types";

type DragItem =
  | { type: "lib"; meal: MealDTO }
  | { type: "pm"; planned: PlannedDTO };

const cellKey = (date: string, slot: Slot) => `${date}|${slot}`;

export default function WeekCalendar({
  weekStart,
  initialPlanned,
  library,
}: {
  weekStart: string;
  initialPlanned: PlannedDTO[];
  library: MealDTO[];
}) {
  const router = useRouter();
  const [planned, setPlanned] = useState<Record<string, PlannedDTO>>(() =>
    Object.fromEntries(initialPlanned.map((p) => [cellKey(p.date, p.slot), p])),
  );
  const [dragging, setDragging] = useState<DragItem | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const today = todayYMD();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const visibleLibrary = library.filter((m) =>
    m.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function applyRows(rows: PlannedDTO[], removeKeys: string[] = []) {
    setPlanned((prev) => {
      const next = { ...prev };
      for (const k of removeKeys) delete next[k];
      // Remove stale positions of the affected rows, then place them fresh.
      for (const row of rows) {
        for (const [k, v] of Object.entries(next)) if (v.id === row.id) delete next[k];
        next[cellKey(row.date, row.slot)] = row;
      }
      return next;
    });
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(e.active.data.current as DragItem);
  }

  async function onDragEnd(e: DragEndEvent) {
    const item = e.active.data.current as DragItem;
    setDragging(null);
    const overId = e.over?.id as string | undefined;
    if (!overId) return;

    setSaving(true);
    try {
      if (overId === "trash") {
        if (item.type === "pm") {
          const res = await fetch(`/api/planned-meals/${item.planned.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setPlanned((prev) => {
              const next = { ...prev };
              delete next[cellKey(item.planned.date, item.planned.slot)];
              return next;
            });
          }
        }
        return;
      }

      if (!overId.startsWith("cell:")) return;
      const [, date, slot] = overId.split(":") as [string, string, Slot];

      if (item.type === "lib") {
        const res = await fetch("/api/planned-meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, slot, mealId: item.meal.id }),
        });
        if (res.ok) {
          const created = await res.json();
          applyRows([serialize(created)]);
        } else {
          alert("Could not save that — please try again.");
        }
        return;
      }

      // Moving an existing card
      if (item.planned.date === date && item.planned.slot === slot) return;
      const res = await fetch("/api/planned-meals/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.planned.id, date, slot }),
      });
      if (res.ok) {
        const rows: PlannedDTO[] = (await res.json()).map(serialize);
        applyRows(rows, [cellKey(item.planned.date, item.planned.slot)]);
      } else {
        alert("Could not move that — please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 font-sans lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {fmtWeekRange(weekStart)}
            </h1>
            {saving && <span className="text-xs text-zinc-400">saving…</span>}
            <div className="ml-auto flex gap-1">
              <NavBtn href={`/?week=${addDays(weekStart, -7)}`}>← Prev</NavBtn>
              <NavBtn href="/">Today</NavBtn>
              <NavBtn href={`/?week=${addDays(weekStart, 7)}`}>Next →</NavBtn>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[840px] grid-cols-[70px_repeat(7,1fr)] gap-1">
              <div />
              {days.map((d) => (
                <div
                  key={d}
                  className={`rounded-md px-2 py-1 text-center text-xs font-semibold ${
                    d === today
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500"
                  }`}
                >
                  {new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
                    weekday: "short",
                    timeZone: "UTC",
                  })}
                  <span className="ml-1 font-normal">
                    {new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
              ))}

              {SLOTS.map((slot) => (
                <SlotRow
                  key={slot}
                  slot={slot}
                  days={days}
                  planned={planned}
                />
              ))}
            </div>
          </div>

          <TrashZone active={dragging !== null} />
        </div>

        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Meal Library
              </h2>
              <Link href="/meals" className="text-xs text-zinc-500 hover:underline">
                Manage
              </Link>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="mb-2 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {library.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">
                No meals yet —{" "}
                <Link href="/meals" className="underline">
                  add some
                </Link>{" "}
                to start planning.
              </p>
            ) : (
              <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto lg:max-h-[70vh]">
                {visibleLibrary.map((m) => (
                  <LibraryChip key={m.id} meal={m} />
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-snug text-zinc-400">
              Drag a meal onto any day. Drag cards between days to rearrange — drop on a
              filled cell to swap.
            </p>
          </div>
        </aside>
      </main>

      <DragOverlay dropAnimation={null}>
        {dragging?.type === "lib" && <ChipGhost name={dragging.meal.name} color={dragging.meal.colorHex} />}
        {dragging?.type === "pm" && (
          <ChipGhost name={dragging.planned.meal.name} color={dragging.planned.meal.colorHex} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function serialize(row: PlannedDTO & { date: string }): PlannedDTO {
  return { ...row, date: String(row.date).slice(0, 10) };
}

function NavBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </Link>
  );
}

function SlotRow({
  slot,
  days,
  planned,
}: {
  slot: Slot;
  days: string[];
  planned: Record<string, PlannedDTO>;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-2 text-xs font-semibold text-zinc-400">
        {SLOT_LABELS[slot]}
      </div>
      {days.map((date) => (
        <Cell key={date} date={date} slot={slot} planned={planned[cellKey(date, slot)]} />
      ))}
    </>
  );
}

function Cell({ date, slot, planned }: { date: string; slot: Slot; planned?: PlannedDTO }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${date}:${slot}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[72px] rounded-lg border p-1 transition-colors ${
        isOver
          ? "border-zinc-500 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      {planned && <PlannedCard planned={planned} />}
    </div>
  );
}

function PlannedCard({ planned }: { planned: PlannedDTO }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pm:${planned.id}`,
    data: { type: "pm", planned } satisfies DragItem,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex h-full cursor-grab flex-col gap-0.5 rounded-md p-1.5 text-xs active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
      style={{ backgroundColor: planned.meal.colorHex + "22" }}
    >
      <div className="flex items-center gap-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: planned.meal.colorHex }}
        />
        <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
          {planned.meal.name}
        </span>
        {planned.locked && <span title="Locked">🔒</span>}
      </div>
      {planned.meal.prepMinutes > 0 && (
        <span className="text-[10px] text-zinc-500">⏱ {planned.meal.prepMinutes}m</span>
      )}
    </div>
  );
}

function LibraryChip({ meal }: { meal: MealDTO }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib:${meal.id}`,
    data: { type: "lib", meal } satisfies DragItem,
  });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-center gap-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm active:cursor-grabbing dark:border-zinc-800 ${
        isDragging ? "opacity-30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meal.colorHex }} />
      <span className="truncate text-zinc-800 dark:text-zinc-200">{meal.name}</span>
      <span className="ml-auto text-[10px] text-zinc-400">
        {meal.mealTypes.map((s) => s[0]).join("")}
      </span>
    </li>
  );
}

function ChipGhost({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <span className="font-medium text-zinc-800 dark:text-zinc-200">{name}</span>
    </div>
  );
}

function TrashZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });
  return (
    <div
      ref={setNodeRef}
      className={`mt-3 flex items-center justify-center rounded-xl border-2 border-dashed py-3 text-sm transition-all ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      } ${
        isOver
          ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950"
          : "border-zinc-300 text-zinc-400 dark:border-zinc-700"
      }`}
    >
      🗑 Drop here to remove from the plan
    </div>
  );
}
