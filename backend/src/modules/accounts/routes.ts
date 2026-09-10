import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CHECKING", "SAVINGS", "DIGITAL", "CREDIT_CARD"]),
  institution: z.string().optional().nullable(),
  initialBalanceCents: z.number().int().default(0),
  creditLimitCents: z.number().int().optional().nullable(),
  closingDay: z.number().int().min(1).max(31).optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const includeArchived = req.query.includeArchived === "true";
    const accounts = await prisma.account.findMany({
      where: { entityId: req.entityId!, ...(includeArchived ? {} : { archived: false }) },
      orderBy: { createdAt: "asc" },
    });

    // Attach a running balance computed from initial balance + transactions.
    const withBalance = await Promise.all(
      accounts.map(async (account) => {
        const agg = await prisma.transaction.aggregate({
          where: { accountId: account.id },
          _sum: { amountCents: true },
        });
        const txSum = agg._sum.amountCents ?? 0;
        const incomeSum = await prisma.transaction.aggregate({
          where: { accountId: account.id, type: "INCOME" },
          _sum: { amountCents: true },
        });
        const expenseSum = await prisma.transaction.aggregate({
          where: { accountId: account.id, type: "EXPENSE" },
          _sum: { amountCents: true },
        });
        const balanceCents =
          account.initialBalanceCents +
          (incomeSum._sum.amountCents ?? 0) -
          (expenseSum._sum.amountCents ?? 0);
        return { ...account, balanceCents };
      })
    );

    res.json(withBalance);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(accountSchema, req.body);
    const account = await prisma.account.create({
      data: { ...data, entityId: req.entityId! },
    });
    res.status(201).json(account);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(accountSchema.partial(), req.body);
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Conta não encontrada." });
    const account = await prisma.account.update({ where: { id: existing.id }, data });
    res.json(account);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Conta não encontrada." });

    const txCount = await prisma.transaction.count({ where: { accountId: existing.id } });
    if (txCount > 0) {
      // Preserve transaction history; archive instead of hard-deleting.
      const account = await prisma.account.update({
        where: { id: existing.id },
        data: { archived: true },
      });
      return res.json({ archived: true, account });
    }
    await prisma.account.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
