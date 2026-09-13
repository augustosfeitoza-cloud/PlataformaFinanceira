export interface User {
  id: string;
  name: string;
  email: string;
}

export interface FinancialEntity {
  id: string;
  name: string;
  type: "PF" | "PJ";
}

export interface Account {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "DIGITAL" | "CREDIT_CARD";
  institution: string | null;
  initialBalanceCents: number;
  creditLimitCents: number | null;
  closingDay: number | null;
  dueDay: number | null;
  archived: boolean;
  balanceCents: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  expenseKind: string | null;
  isDefault: boolean;
  subcategories: Subcategory[];
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  subcategoryId: string | null;
  type: "INCOME" | "EXPENSE";
  description: string;
  amountCents: number;
  date: string;
  paymentMethod: string;
  recurrence: string;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  invoiceMonth: string | null;
  notes: string | null;
  account?: Account;
  category?: Category;
  subcategory?: Subcategory | null;
}

export interface Investment {
  id: string;
  class: "FIXED_INCOME" | "VARIABLE_INCOME" | "FUND";
  subtype: string;
  name: string;
  broker: string | null;
  investedAmountCents: number;
  currentAmountCents: number;
  purchaseDate: string;
  maturityDate: string | null;
  rateInfo: string | null;
  notes: string | null;
}

export interface Goal {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string;
  plannedAmountCents: number;
  category?: Category;
}

export interface ObligationType {
  id: string;
  name: string;
  recurrence: "MONTHLY" | "ANNUAL";
  dueDay: number;
  dueMonthOffset: number;
  dueMonth: number | null;
  isDefault: boolean;
}

export interface ClientObligation {
  id: string;
  clientId: string;
  obligationTypeId: string;
  active: boolean;
  obligationType: ObligationType;
}

export interface Client {
  id: string;
  name: string;
  document: string | null;
  regime: "MEI" | "SIMPLES_NACIONAL";
  active: boolean;
  notes: string | null;
  obligations: ClientObligation[];
}

export interface ObligationCompletion {
  id: string;
  clientObligationId: string;
  competence: string;
  completedAt: string;
  protocolNumber: string | null;
  notes: string | null;
}

export interface ObligationDashboardItem {
  clientObligationId: string;
  clientId: string;
  clientName: string;
  clientRegime: "MEI" | "SIMPLES_NACIONAL";
  obligationTypeId: string;
  obligationTypeName: string;
  recurrence: "MONTHLY" | "ANNUAL";
  competence: string;
  dueDate: string;
  status: "DONE" | "LATE" | "PENDING";
  completion: ObligationCompletion | null;
}
