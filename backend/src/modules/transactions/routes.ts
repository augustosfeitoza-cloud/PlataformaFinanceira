import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { computeInvoiceMonth, generateRecurrenceDates, splitAmount } from "./recurrence";

const router = Router();
router.use(requireAuth);

const transactionSchema = z.object({
  accountId: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  date: z.coerce.date(),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "BOLETO", "TRANSFER", "CASH"]),
  recurrence: z.enum(["NONE", "WEEKLY", "MONTHLY", "YEARLY"]).default("NONE"),
  recurrenceEndDate: z.coerce.date().optional().nullable(),
  installments: z.number().int().min(1).max(60).default(1),
  notes: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { from, to, type, accountId, categoryId, month } = req.query as Record<string, string>;
    const where: any = { entityId: req.entityId! };
    if (type) where.type = type;
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    } else if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { account: true, category: true, subcategory: true },
      orderBy: { date: "desc" },
    });
    res.json(transactions);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(transactionSchema, req.body);

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, entityId: req.entityId! },
    });
    if (!account) return res.status(404).json({ error: "Conta não encontrada." });

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, entityId: req.entityId! },
    });
    if (!category) return res.status(404).json({ error: "Categoria não encontrada." });

    const installments = data.installments ?? 1;
    const isCreditCard = account.type === "CREDIT_CARD";
    const useInstallments = isCreditCard && installments > 1;
    const useRecurrence = !useInstallments && data.recurrence !== "NONE";

    const baseData = {
      entityId: req.entityId!,
      accountId: account.id,
      categoryId: category.id,
      subcategoryId: data.subcategoryId ?? null,
      type: data.type,
      description: data.description,
      paymentMethod: data.paymentMethod,
      notes: data.notes ?? null,
    };

    if (useInstallments) {
      const seriesId = randomUUID();
      const amounts = splitAmount(data.amountCents, installments);
      const created = await prisma.$transaction(
        amounts.map((amountCents, i) => {
          const installmentDate = new Date(data.date);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          return prisma.transaction.create({
            data: {
              ...baseData,
              amountCents,
              date: installmentDate,
              recurrence: "NONE",
              installmentGroupId: seriesId,
              installmentNumber: i + 1,
              installmentTotal: installments,
              invoiceMonth: computeInvoiceMonth(installmentDate, account.closingDay),
            },
          });
        })
      );
      return res.status(201).json(created);
    }

    if (useRecurrence) {
      const seriesId = randomUUID();
      const dates = generateRecurrenceDates(
        data.date,
        data.recurrence as "WEEKLY" | "MONTHLY" | "YEARLY",
        data.recurrenceEndDate ?? null
      );
      const created = await prisma.$transaction(
        dates.map((date) =>
          prisma.transaction.create({
            data: {
              ...baseData,
              amountCents: data.amountCents,
              date,
              recurrence: data.recurrence,
              recurrenceEndDate: data.recurrenceEndDate ?? null,
              installmentGroupId: seriesId,
              invoiceMonth: isCreditCard ? computeInvoiceMonth(date, account.closingDay) : null,
            },
          })
        )
      );
      return res.status(201).json(created);
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...baseData,
        amountCents: data.amountCents,
        date: data.date,
        recurrence: "NONE",
        invoiceMonth: isCreditCard ? computeInvoiceMonth(data.date, account.closingDay) : null,
      },
    });
    res.status(201).json(transaction);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(transactionSchema.partial(), req.body);
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
      include: { account: true },
    });
    if (!existing) return res.status(404).json({ error: "Transação não encontrada." });

    const account = data.accountId
      ? await prisma.account.findFirst({ where: { id: data.accountId, entityId: req.entityId! } })
      : existing.account;
    if (!account) return res.status(404).json({ error: "Conta não encontrada." });

    const date = data.date ?? existing.date;
    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: data.accountId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        type: data.type,
        description: data.description,
        amountCents: data.amountCents,
        date,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        invoiceMonth: account.type === "CREDIT_CARD" ? computeInvoiceMonth(date, account.closingDay) : null,
      },
    });
    res.json(transaction);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Transação não encontrada." });

    const deleteSeries = req.query.deleteSeries === "true";
    if (deleteSeries && existing.installmentGroupId) {
      await prisma.transaction.deleteMany({
        where: { installmentGroupId: existing.installmentGroupId, entityId: req.entityId! },
      });
      return res.status(204).send();
    }
    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

// Credit card invoice (fatura): all transactions grouped into a given
// account + invoice month, plus the total due.
router.get(
  "/invoice",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { accountId, month } = req.query as Record<string, string>;
    if (!accountId || !month) {
      return res.status(400).json({ error: "accountId e month são obrigatórios." });
    }
    const account = await prisma.account.findFirst({
      where: { id: accountId, entityId: req.entityId!, type: "CREDIT_CARD" },
    });
    if (!account) return res.status(404).json({ error: "Cartão não encontrado." });

    const transactions = await prisma.transaction.findMany({
      where: { accountId, entityId: req.entityId!, invoiceMonth: month },
      include: { category: true, subcategory: true },
      orderBy: { date: "asc" },
    });
    const totalCents = transactions.reduce((sum, t) => sum + t.amountCents, 0);
    res.json({ account, month, totalCents, transactions });
  })
);

export default router;
