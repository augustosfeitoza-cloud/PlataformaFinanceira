import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmountCents: z.number().int().positive(),
  currentAmountCents: z.number().int().nonnegative().default(0),
  targetDate: z.coerce.date().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const goals = await prisma.goal.findMany({
      where: { entityId: req.entityId! },
      orderBy: { createdAt: "asc" },
    });
    res.json(goals);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(goalSchema, req.body);
    const goal = await prisma.goal.create({ data: { ...data, entityId: req.entityId! } });
    res.status(201).json(goal);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(goalSchema.partial(), req.body);
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Meta não encontrada." });
    const goal = await prisma.goal.update({ where: { id: existing.id }, data });
    res.json(goal);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Meta não encontrada." });
    await prisma.goal.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
