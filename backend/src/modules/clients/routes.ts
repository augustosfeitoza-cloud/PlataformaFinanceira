import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const clientSchema = z.object({
  name: z.string().min(1),
  document: z.string().optional().nullable(),
  regime: z.enum(["MEI", "SIMPLES_NACIONAL"]),
  active: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId! },
      include: { obligations: { include: { obligationType: true } } },
      orderBy: { name: "asc" },
    });
    res.json(clients);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(clientSchema, req.body);

    // New clients start subscribed to every obligation type in the
    // accountant's catalog; they can turn off the ones that don't apply
    // (e.g. a MEI without DCTFWeb) from the client's obligation list.
    const types = await prisma.obligationType.findMany({ where: { userId: req.userId! } });

    const client = await prisma.client.create({
      data: {
        ...data,
        userId: req.userId!,
        obligations: { create: types.map((t) => ({ obligationTypeId: t.id })) },
      },
      include: { obligations: { include: { obligationType: true } } },
    });
    res.status(201).json(client);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(clientSchema.partial(), req.body);
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: "Cliente não encontrado." });
    const client = await prisma.client.update({ where: { id: existing.id }, data });
    res.json(client);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: "Cliente não encontrado." });
    await prisma.client.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
