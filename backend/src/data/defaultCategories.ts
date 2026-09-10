// Default category/subcategory set seeded for every new Pessoa Física entity.
// Kept as plain data (not DB calls) so it can be reused by both the signup
// flow (src/modules/auth/routes.ts) and the demo seed script (prisma/seed.ts).

export const DEFAULT_INCOME_CATEGORIES: { name: string; subcategories: string[] }[] = [
  { name: "Salário", subcategories: ["Salário CLT", "Pró-labore", "13º salário", "Férias"] },
  { name: "Renda Extra", subcategories: ["Freelance", "Comissões", "Vendas"] },
  { name: "Investimentos", subcategories: ["Dividendos", "Juros", "Resgates"] },
  { name: "Outros", subcategories: ["Presentes", "Reembolsos"] },
];

export const DEFAULT_EXPENSE_CATEGORIES: {
  name: string;
  expenseKind: string;
  subcategories: string[];
}[] = [
  {
    name: "Essenciais",
    expenseKind: "ESSENTIAL",
    subcategories: ["Moradia", "Alimentação", "Transporte", "Saúde", "Contas e Utilidades"],
  },
  {
    name: "Lazer",
    expenseKind: "LEISURE",
    subcategories: ["Viagens", "Restaurantes", "Streaming", "Hobbies"],
  },
  {
    name: "Educação",
    expenseKind: "EDUCATION",
    subcategories: ["Cursos", "Mensalidade", "Livros e Materiais"],
  },
  {
    name: "Compras",
    expenseKind: "SHOPPING",
    subcategories: ["Vestuário", "Eletrônicos", "Casa"],
  },
  {
    name: "Financeiro",
    expenseKind: "FINANCIAL",
    subcategories: ["Empréstimos", "Tarifas Bancárias", "Impostos", "Seguros"],
  },
  {
    name: "Investimentos",
    expenseKind: "INVESTMENT",
    subcategories: ["Aportes Renda Fixa", "Aportes Renda Variável", "Reserva de Emergência"],
  },
];
