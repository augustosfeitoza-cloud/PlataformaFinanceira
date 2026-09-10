// Helpers for expanding a single user-entered transaction into the series
// of rows actually stored: credit-card installments (parcelas) and/or
// recurring occurrences (recorrência). Both kinds of series share the
// `installmentGroupId` column as a generic "series id".

export function computeInvoiceMonth(date: Date, closingDay: number | null | undefined): string {
  const d = new Date(date);
  if (closingDay && d.getDate() > closingDay) {
    d.setMonth(d.getMonth() + 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addInterval(date: Date, unit: "WEEKLY" | "MONTHLY" | "YEARLY", steps: number): Date {
  const d = new Date(date);
  if (unit === "WEEKLY") d.setDate(d.getDate() + 7 * steps);
  if (unit === "MONTHLY") d.setMonth(d.getMonth() + steps);
  if (unit === "YEARLY") d.setFullYear(d.getFullYear() + steps);
  return d;
}

// Splits a total amount into N installments in whole cents, putting the
// rounding remainder on the last installment so the sum always matches.
export function splitAmount(totalCents: number, parts: number): number[] {
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents - base * parts;
  return Array.from({ length: parts }, (_, i) => (i === parts - 1 ? base + remainder : base));
}

const MAX_GENERATED_OCCURRENCES = 60;

export function generateRecurrenceDates(
  startDate: Date,
  recurrence: "WEEKLY" | "MONTHLY" | "YEARLY",
  endDate: Date | null
): Date[] {
  const dates: Date[] = [startDate];
  let current = startDate;
  while (dates.length < MAX_GENERATED_OCCURRENCES) {
    current = addInterval(current, recurrence, 1);
    if (endDate && current > endDate) break;
    if (!endDate && dates.length >= 12) break; // default cap: 12 occurrences ahead
    dates.push(current);
  }
  return dates;
}
