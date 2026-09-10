export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function brlToCents(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);
  return Math.round((isNaN(num) ? 0 : num) * 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Poupança",
  DIGITAL: "Conta Digital",
  CREDIT_CARD: "Cartão de Crédito",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  BOLETO: "Boleto",
  TRANSFER: "Transferência",
  CASH: "Dinheiro",
};

export const RECURRENCE_LABEL: Record<string, string> = {
  NONE: "Não recorrente",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export const EXPENSE_KIND_LABEL: Record<string, string> = {
  ESSENTIAL: "Essenciais",
  LEISURE: "Lazer",
  EDUCATION: "Educação",
  SHOPPING: "Compras",
  FINANCIAL: "Financeiro",
  INVESTMENT: "Investimentos",
  OTHER: "Outros",
};

export const INVESTMENT_CLASS_LABEL: Record<string, string> = {
  FIXED_INCOME: "Renda Fixa",
  VARIABLE_INCOME: "Renda Variável",
  FUND: "Fundos",
};

export const INVESTMENT_SUBTYPE_LABEL: Record<string, string> = {
  TESOURO_DIRETO: "Tesouro Direto",
  CDB: "CDB",
  RDB: "RDB",
  LCI: "LCI",
  LCA: "LCA",
  STOCK: "Ações",
  FII: "FII",
  ETF: "ETF",
  FUND: "Fundo",
  OTHER: "Outro",
};
