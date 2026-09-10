// Demo seed: creates one demo user with a PF entity, default categories,
// a couple of accounts, sample transactions, an investment and a goal.
// Safe to run repeatedly against a fresh dev.db (it does not dedupe).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../src/data/defaultCategories";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@plataforma.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists, skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.create({
    data: {
      name: "Usuário Demo",
      email,
      passwordHash,
      entities: {
        create: {
          name: "Pessoa Física",
          type: "PF",
        },
      },
    },
    include: { entities: true },
  });
  const entity = user.entities[0];

  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    await prisma.category.create({
      data: {
        entityId: entity.id,
        name: cat.name,
        type: "INCOME",
        isDefault: true,
        subcategories: { create: cat.subcategories.map((name) => ({ name })) },
      },
    });
  }

  const expenseCategories = [];
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        entityId: entity.id,
        name: cat.name,
        type: "EXPENSE",
        expenseKind: cat.expenseKind as any,
        isDefault: true,
        subcategories: { create: cat.subcategories.map((name) => ({ name })) },
      },
      include: { subcategories: true },
    });
    expenseCategories.push(created);
  }

  const checking = await prisma.account.create({
    data: {
      entityId: entity.id,
      name: "Conta Corrente Principal",
      type: "CHECKING",
      institution: "Banco Exemplo",
      initialBalanceCents: 500000,
    },
  });

  const creditCard = await prisma.account.create({
    data: {
      entityId: entity.id,
      name: "Cartão Nubank",
      type: "CREDIT_CARD",
      institution: "Nubank",
      creditLimitCents: 300000,
      closingDay: 25,
      dueDay: 5,
    },
  });

  const salaryCategory = await prisma.category.findFirstOrThrow({
    where: { entityId: entity.id, name: "Salário" },
  });
  const essenciaisCategory = expenseCategories.find((c) => c.name === "Essenciais")!;
  const lazerCategory = expenseCategories.find((c) => c.name === "Lazer")!;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await prisma.transaction.create({
    data: {
      entityId: entity.id,
      accountId: checking.id,
      categoryId: salaryCategory.id,
      type: "INCOME",
      description: "Salário mensal",
      amountCents: 800000,
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      paymentMethod: "TRANSFER",
      recurrence: "MONTHLY",
    },
  });

  await prisma.transaction.create({
    data: {
      entityId: entity.id,
      accountId: checking.id,
      categoryId: essenciaisCategory.id,
      subcategoryId: essenciaisCategory.subcategories.find((s) => s.name === "Moradia")?.id,
      type: "EXPENSE",
      description: "Aluguel",
      amountCents: 200000,
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      paymentMethod: "PIX",
      recurrence: "MONTHLY",
    },
  });

  await prisma.transaction.create({
    data: {
      entityId: entity.id,
      accountId: creditCard.id,
      categoryId: lazerCategory.id,
      subcategoryId: lazerCategory.subcategories.find((s) => s.name === "Restaurantes")?.id,
      type: "EXPENSE",
      description: "Jantar",
      amountCents: 15000,
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      paymentMethod: "CREDIT_CARD",
      invoiceMonth: thisMonth,
    },
  });

  await prisma.investment.create({
    data: {
      entityId: entity.id,
      class: "FIXED_INCOME",
      subtype: "CDB",
      name: "CDB Banco Exemplo 110% CDI",
      broker: "Banco Exemplo",
      investedAmountCents: 1000000,
      currentAmountCents: 1035000,
      purchaseDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
      rateInfo: "110% CDI",
    },
  });

  await prisma.goal.create({
    data: {
      entityId: entity.id,
      name: "Reserva de emergência",
      targetAmountCents: 3000000,
      currentAmountCents: 1000000,
      targetDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
    },
  });

  console.log("Seed complete. Login with demo@plataforma.local / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
