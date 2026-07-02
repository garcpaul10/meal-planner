// Default color palette by meal category. A meal's colorHex is set from this
// when created, but can be overridden per meal in the form.
export const CATEGORY_COLORS: Record<string, string> = {
  "protein-heavy": "#ef4444",
  pasta: "#f59e0b",
  soup: "#f97316",
  salad: "#22c55e",
  "rice-bowl": "#eab308",
  sandwich: "#a855f7",
  breakfast: "#38bdf8",
  snack: "#94a3b8",
  takeout: "#ec4899",
  other: "#64748b",
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function defaultColorFor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
}
