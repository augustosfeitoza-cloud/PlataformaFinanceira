import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const budgetSchema = z.object({
  categoryId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use o formato YYYY-MM."),
  plannedAmountCents: z.number().int().nonnegative(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const month = req.query.month as string | undefined;
    const budgets = await prisma.budget.findMany({
      where: { entityId: req.entityId!, ...(month ? { month } : {}) },
      include: { category: true },
      orderBy: { month: "desc" },
    });
    res.json(budgets);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(budgetSchema, req.body);
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, entityId: req.entityId! },
    });
    if (!category) return res.status(404).json({ error: "Categoria não encontrada." });

    const budget = await prisma.budget.upsert({
      where: { categoryId_month: { categoryId: data.categoryId, month: data.month } },
      update: { plannedAmountCents: data.plannedAmountCents },
      create: { ...data, entityId: req.entityId! },
    });
    res.status(201).json(budget);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.budget.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Orçamento não encontrado." });
    await prisma.budget.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
