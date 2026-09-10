import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const EXPENSE_KINDS = [
  "ESSENTIAL",
  "LEISURE",
  "EDUCATION",
  "SHOPPING",
  "FINANCIAL",
  "INVESTMENT",
  "OTHER",
] as const;

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  expenseKind: z.enum(EXPENSE_KINDS).optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const type = req.query.type as string | undefined;
    const categories = await prisma.category.findMany({
      where: { entityId: req.entityId!, ...(type ? { type: type as any } : {}) },
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(categorySchema, req.body);
    const category = await prisma.category.create({
      data: { ...data, entityId: req.entityId! },
      include: { subcategories: true },
    });
    res.status(201).json(category);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(categorySchema.partial(), req.body);
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Categoria não encontrada." });
    const category = await prisma.category.update({ where: { id: existing.id }, data });
    res.json(category);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Categoria não encontrada." });
    const txCount = await prisma.transaction.count({ where: { categoryId: existing.id } });
    if (txCount > 0) {
      return res
        .status(409)
        .json({ error: "Não é possível excluir: existem transações usando esta categoria." });
    }
    await prisma.category.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const subcategorySchema = z.object({ name: z.string().min(1) });

router.post(
  "/:id/subcategories",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(subcategorySchema, req.body);
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!category) return res.status(404).json({ error: "Categoria não encontrada." });
    const subcategory = await prisma.subcategory.create({
      data: { name: data.name, categoryId: category.id },
    });
    res.status(201).json(subcategory);
  })
);

router.delete(
  "/subcategories/:subId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const sub = await prisma.subcategory.findFirst({
      where: { id: req.params.subId, category: { entityId: req.entityId! } },
    });
    if (!sub) return res.status(404).json({ error: "Subcategoria não encontrada." });
    await prisma.subcategory.delete({ where: { id: sub.id } });
    res.status(204).send();
  })
);

export default router;
