import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const toggleSchema = z.object({ active: z.boolean() });

// Toggles whether a given obligation type applies to a given client (e.g.
// turning off DCTFWeb for a MEI that doesn't need to file it), without
// losing the client's filing history for it.
router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(toggleSchema, req.body);
    const existing = await prisma.clientObligation.findFirst({
      where: { id: req.params.id, client: { userId: req.userId! } },
    });
    if (!existing) return res.status(404).json({ error: "Vínculo não encontrado." });
    const updated = await prisma.clientObligation.update({
      where: { id: existing.id },
      data,
      include: { obligationType: true },
    });
    res.json(updated);
  })
);

export default router;
