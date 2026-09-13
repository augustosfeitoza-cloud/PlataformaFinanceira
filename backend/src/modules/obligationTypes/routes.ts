import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const baseSchema = z.object({
  name: z.string().min(1),
  recurrence: z.enum(["MONTHLY", "ANNUAL"]),
  dueDay: z.number().int().min(1).max(31).default(20),
  dueMonthOffset: z.number().int().min(0).max(1).default(1),
  dueMonth: z.number().int().min(1).max(12).optional().nullable(),
});

const obligationTypeSchema = baseSchema.refine(
  (data) => data.recurrence !== "ANNUAL" || !!data.dueMonth,
  { message: "Informe o mês de vencimento para obrigações anuais.", path: ["dueMonth"] }
);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const types = await prisma.obligationType.findMany({
      where: { userId: req.userId! },
      orderBy: [{ recurrence: "asc" }, { name: "asc" }],
    });
    res.json(types);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(obligationTypeSchema, req.body);

    const type = await prisma.obligationType.create({ data: { ...data, userId: req.userId! } });

    // Backfill: automatically apply new obligation types to every existing
    // client, mirroring what happens when a client is first created.
    const clients = await prisma.client.findMany({ where: { userId: req.userId! } });
    await prisma.clientObligation.createMany({
      data: clients.map((c) => ({ clientId: c.id, obligationTypeId: type.id })),
    });

    res.status(201).json(type);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(baseSchema.partial(), req.body);
    const existing = await prisma.obligationType.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: "Obrigação não encontrada." });
    const type = await prisma.obligationType.update({ where: { id: existing.id }, data });
    res.json(type);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.obligationType.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: "Obrigação não encontrada." });
    await prisma.obligationType.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
