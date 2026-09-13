// Pure date-string math for the obligations dashboard. Deliberately avoids
// the JS Date object for anything that ends up in a response, since
// converting a local midnight to an ISO string can shift the calendar day
// depending on the server's timezone offset — these are plain civil dates
// (no time-of-day), so we keep them as zero-padded "YYYY-MM-DD" strings and
// compare/sort them lexicographically instead.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseMonthKey(month: string): { year: number; month: number } {
  const [year, monthNum] = month.split("-").map(Number);
  return { year, month: monthNum };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = month - 1 + delta;
  const y = year + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12 + 1;
  return { year: y, month: m };
}

export function daysInMonth(year: number, month: number): number {
  // Passing a 1-based `month` as the (0-based) month-index argument with
  // day 0 yields the last day of the *previous* month-index, i.e. of the
  // 1-based month we asked for.
  return new Date(year, month, 0).getDate();
}

export function buildDateStr(year: number, month: number, day: number): string {
  const clampedDay = Math.min(day, daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(clampedDay)}`;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function todayStr(): string {
  const now = new Date();
  return buildDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
