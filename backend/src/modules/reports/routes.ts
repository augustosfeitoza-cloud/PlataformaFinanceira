import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Saldo do mês, receitas, despesas e % da renda comprometida (despesas / receitas).
router.get(
  "/summary",
  asyncHandler(async (req: AuthedRequest, res) => {
    const month = (req.query.month as string) || currentMonthKey();
    const { start, end } = monthRange(month);

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { entityId: req.entityId!, type: "INCOME", date: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: { entityId: req.entityId!, type: "EXPENSE", date: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
    ]);

    const incomeCents = incomeAgg._sum.amountCents ?? 0;
    const expenseCents = expenseAgg._sum.amountCents ?? 0;
    const balanceCents = incomeCents - expenseCents;
    const committedPercent = incomeCents > 0 ? (expenseCents / incomeCents) * 100 : null;

    res.json({ month, incomeCents, expenseCents, balanceCents, committedPercent });
  })
);

// Despesas agrupadas por categoria (e por "expenseKind") com percentual do total.
router.get(
  "/by-category",
  asyncHandler(async (req: AuthedRequest, res) => {
    const month = (req.query.month as string) || currentMonthKey();
    const type = (req.query.type as string) || "EXPENSE";
    const { start, end } = monthRange(month);

    const transactions = await prisma.transaction.findMany({
      where: { entityId: req.entityId!, type: type as any, date: { gte: start, lt: end } },
      include: { category: true },
    });

    const totalCents = transactions.reduce((sum, t) => sum + t.amountCents, 0);
    const byCategory = new Map<
      string,
      { categoryId: string; name: string; expenseKind: string | null; amountCents: number }
    >();
    for (const t of transactions) {
      const key = t.categoryId;
      const entry = byCategory.get(key) ?? {
        categoryId: t.categoryId,
        name: t.category.name,
        expenseKind: t.category.expenseKind,
        amountCents: 0,
      };
      entry.amountCents += t.amountCents;
      byCategory.set(key, entry);
    }

    const result = Array.from(byCategory.values())
      .map((c) => ({ ...c, percent: totalCents > 0 ? (c.amountCents / totalCents) * 100 : 0 }))
      .sort((a, b) => b.amountCents - a.amountCents);

    res.json({ month, totalCents, categories: result });
  })
);

// Planejado (orçamento) x Realizado (gasto real) por categoria no mês.
router.get(
  "/budget-vs-actual",
  asyncHandler(async (req: AuthedRequest, res) => {
    const month = (req.query.month as string) || currentMonthKey();
    const { start, end } = monthRange(month);

    const budgets = await prisma.budget.findMany({
      where: { entityId: req.entityId!, month },
      include: { category: true },
    });

    const actualByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { entityId: req.entityId!, type: "EXPENSE", date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    });
    const actualMap = new Map(actualByCategory.map((a) => [a.categoryId, a._sum.amountCents ?? 0]));

    const result = budgets.map((b) => {
      const actualCents = actualMap.get(b.categoryId) ?? 0;
      return {
        categoryId: b.categoryId,
        categoryName: b.category.name,
        plannedCents: b.plannedAmountCents,
        actualCents,
        differenceCents: b.plannedAmountCents - actualCents,
        percentUsed: b.plannedAmountCents > 0 ? (actualCents / b.plannedAmountCents) * 100 : null,
      };
    });

    res.json({ month, budgets: result });
  })
);

// Evolução patrimonial: saldo acumulado das contas + valor de investimentos,
// mês a mês, para os últimos `months` meses (default 12).
//
// Simplificação assumida: como não guardamos snapshots históricos de preço
// de investimentos, meses passados usam o valor investido (investedAmountCents)
// e o mês corrente usa o valor atual (currentAmountCents). Isso é suficiente
// para uma visão de tendência; um histórico de cotas por dia é um upgrade
// natural do módulo de investimentos futuramente.
router.get(
  "/net-worth",
  asyncHandler(async (req: AuthedRequest, res) => {
    const months = Number(req.query.months) || 12;
    const now = new Date();
    const currentKey = currentMonthKey(now);

    const [accounts, investments] = await Promise.all([
      prisma.account.findMany({ where: { entityId: req.entityId! } }),
      prisma.investment.findMany({ where: { entityId: req.entityId! } }),
    ]);

    const series = [];
    for (let i = months - 1; i >= 0; i--) {
      const refDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const key = currentMonthKey(refDate);

      let accountsTotal = 0;
      for (const account of accounts) {
        if (account.type === "CREDIT_CARD") continue; // credit cards are liabilities, not held balance
        const agg = await prisma.transaction.aggregate({
          where: { accountId: account.id, date: { lt: monthEnd } },
          _sum: { amountCents: true },
        });
        const incomeAgg = await prisma.transaction.aggregate({
          where: { accountId: account.id, type: "INCOME", date: { lt: monthEnd } },
          _sum: { amountCents: true },
        });
        const expenseAgg = await prisma.transaction.aggregate({
          where: { accountId: account.id, type: "EXPENSE", date: { lt: monthEnd } },
          _sum: { amountCents: true },
        });
        accountsTotal +=
          account.initialBalanceCents +
          (incomeAgg._sum.amountCents ?? 0) -
          (expenseAgg._sum.amountCents ?? 0);
      }

      let investmentsTotal = 0;
      for (const inv of investments) {
        if (inv.purchaseDate >= monthEnd) continue;
        investmentsTotal += key === currentKey ? inv.currentAmountCents : inv.investedAmountCents;
      }

      series.push({
        month: key,
        accountsCents: accountsTotal,
        investmentsCents: investmentsTotal,
        totalCents: accountsTotal + investmentsTotal,
      });
    }

    res.json(series);
  })
);

export default router;
