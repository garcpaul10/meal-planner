// All calendar dates are plain "YYYY-MM-DD" strings; math is done in UTC to
// avoid timezone drift between the server (UTC on Vercel) and the browser.

export function todayYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(ymd: string): string {
  const d = new Date(ymd + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(ymd, -dow);
}

export function fmtDay(ymd: string): string {
  return new Date(ymd + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function fmtWeekRange(weekStart: string): string {
  const opts = { month: "short", day: "numeric", timeZone: "UTC" } as const;
  const start = new Date(weekStart + "T00:00:00Z").toLocaleDateString("en-US", opts);
  const end = new Date(addDays(weekStart, 6) + "T00:00:00Z").toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}
