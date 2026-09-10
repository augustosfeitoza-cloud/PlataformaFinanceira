import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

// Subtypes are intentionally kept as a broad enum with an OTHER fallback so
// new products (e.g. COE, previdência, criptoativos) can be added later by
// extending the enum without changing the read/write paths here.
const investmentSchema = z.object({
  class: z.enum(["FIXED_INCOME", "VARIABLE_INCOME", "FUND"]),
  subtype: z.enum([
    "TESOURO_DIRETO",
    "CDB",
    "RDB",
    "LCI",
    "LCA",
    "STOCK",
    "FII",
    "ETF",
    "FUND",
    "OTHER",
  ]),
  name: z.string().min(1),
  broker: z.string().optional().nullable(),
  investedAmountCents: z.number().int().nonnegative(),
  currentAmountCents: z.number().int().nonnegative(),
  purchaseDate: z.coerce.date(),
  maturityDate: z.coerce.date().optional().nullable(),
  rateInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const investments = await prisma.investment.findMany({
      where: { entityId: req.entityId! },
      orderBy: { purchaseDate: "desc" },
    });
    res.json(investments);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(investmentSchema, req.body);
    const investment = await prisma.investment.create({ data: { ...data, entityId: req.entityId! } });
    res.status(201).json(investment);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(investmentSchema.partial(), req.body);
    const existing = await prisma.investment.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Investimento não encontrado." });
    const investment = await prisma.investment.update({ where: { id: existing.id }, data });
    res.json(investment);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.investment.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!existing) return res.status(404).json({ error: "Investimento não encontrado." });
    await prisma.investment.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const movementSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(["CONTRIBUTION", "WITHDRAWAL", "YIELD"]),
  amountCents: z.number().int().positive(),
});

router.post(
  "/:id/movements",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(movementSchema, req.body);
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!investment) return res.status(404).json({ error: "Investimento não encontrado." });

    const delta =
      data.type === "WITHDRAWAL" ? -data.amountCents : data.amountCents;

    const [movement, updated] = await prisma.$transaction([
      prisma.investmentMovement.create({ data: { ...data, investmentId: investment.id } }),
      prisma.investment.update({
        where: { id: investment.id },
        data: {
          currentAmountCents: investment.currentAmountCents + delta,
          investedAmountCents:
            data.type === "CONTRIBUTION"
              ? investment.investedAmountCents + data.amountCents
              : data.type === "WITHDRAWAL"
              ? Math.max(0, investment.investedAmountCents - data.amountCents)
              : investment.investedAmountCents,
        },
      }),
    ]);
    res.status(201).json({ movement, investment: updated });
  })
);

router.get(
  "/:id/movements",
  asyncHandler(async (req: AuthedRequest, res) => {
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, entityId: req.entityId! },
    });
    if (!investment) return res.status(404).json({ error: "Investimento não encontrado." });
    const movements = await prisma.investmentMovement.findMany({
      where: { investmentId: investment.id },
      orderBy: { date: "desc" },
    });
    res.json(movements);
  })
);

export default router;
