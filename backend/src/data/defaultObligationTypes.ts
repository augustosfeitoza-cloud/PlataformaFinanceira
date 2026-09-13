// Default obligation catalog seeded for every new accountant user. Kept as
// plain data (not DB calls) so it can be reused by both the signup flow
// (src/modules/auth/routes.ts) and the demo seed script (prisma/seed.ts).
//
// Deadlines are the common-case defaults for Simples Nacional/MEI filings;
// the accountant can edit or add entries afterwards (module obligation-types)
// since real due dates vary by municipality/exercício.

export const DEFAULT_OBLIGATION_TYPES: {
  name: string;
  recurrence: "MONTHLY" | "ANNUAL";
  dueDay: number;
  dueMonthOffset: number;
  dueMonth?: number;
}[] = [
  { name: "PGDAS-D", recurrence: "MONTHLY", dueDay: 20, dueMonthOffset: 1 },
  { name: "DCTFWeb", recurrence: "MONTHLY", dueDay: 15, dueMonthOffset: 1 },
  { name: "Escrituração Contábil", recurrence: "MONTHLY", dueDay: 10, dueMonthOffset: 1 },
  { name: "DEFIS", recurrence: "ANNUAL", dueDay: 28, dueMonthOffset: 0, dueMonth: 2 },
  { name: "Emissão TFE", recurrence: "ANNUAL", dueDay: 30, dueMonthOffset: 0, dueMonth: 6 },
];
