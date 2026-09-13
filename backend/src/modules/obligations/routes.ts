import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { AuthedRequest, requireAuth } from "../../middleware/auth";
import { buildDateStr, monthKey, parseMonthKey, shiftMonth, todayStr } from "./dateMath";

const router = Router();
router.use(requireAuth);

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use o formato YYYY-MM."),
  includeInactive: z.string().optional(),
});

// Lists every obligation due within a reference month, across all clients,
// computed on the fly from each active ClientObligation's recurrence rule
// (nothing is pre-created — see the ObligationCompletion model comment).
router.get(
  "/dashboard",
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = parseOrThrow(monthQuerySchema, req.query);
    const { year, month } = parseMonthKey(query.month);
    const today = todayStr();

    const clientObligations = await prisma.clientObligation.findMany({
      where: {
        active: true,
        client: {
          userId: req.userId!,
          ...(query.includeInactive === "true" ? {} : { active: true }),
        },
      },
      include: { client: true, obligationType: true, completions: true },
    });

    const items = clientObligations
      .map((co) => {
        const type = co.obligationType;
        let competence: string;
        let dueDate: string;

        if (type.recurrence === "MONTHLY") {
          const competenceMonth = shiftMonth(year, month, -type.dueMonthOffset);
          competence = monthKey(competenceMonth.year, competenceMonth.month);
          dueDate = buildDateStr(year, month, type.dueDay);
        } else {
          if (type.dueMonth !== month) return null;
          competence = String(year);
          dueDate = buildDateStr(year, type.dueMonth, type.dueDay);
        }

        const completion = co.completions.find((c) => c.competence === competence) ?? null;
        const status = completion ? "DONE" : dueDate < today ? "LATE" : "PENDING";

        return {
          clientObligationId: co.id,
          clientId: co.clientId,
          clientName: co.client.name,
          clientRegime: co.client.regime,
          obligationTypeId: type.id,
          obligationTypeName: type.name,
          recurrence: type.recurrence,
          competence,
          dueDate,
          status,
          completion,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.clientName.localeCompare(b.clientName));

    res.json(items);
  })
);

const completeSchema = z.object({
  clientObligationId: z.string(),
  competence: z.string().min(4),
  protocolNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post(
  "/complete",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = parseOrThrow(completeSchema, req.body);
    const clientObligation = await prisma.clientObligation.findFirst({
      where: { id: data.clientObligationId, client: { userId: req.userId! } },
    });
    if (!clientObligation) return res.status(404).json({ error: "Obrigação não encontrada." });

    const completion = await prisma.obligationCompletion.upsert({
      where: {
        clientObligationId_competence: {
          clientObligationId: data.clientObligationId,
          competence: data.competence,
        },
      },
      update: { protocolNumber: data.protocolNumber, notes: data.notes },
      create: {
        clientObligationId: data.clientObligationId,
        competence: data.competence,
        protocolNumber: data.protocolNumber,
        notes: data.notes,
      },
    });
    res.status(201).json(completion);
  })
);

router.delete(
  "/complete/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.obligationCompletion.findFirst({
      where: { id: req.params.id, clientObligation: { client: { userId: req.userId! } } },
    });
    if (!existing) return res.status(404).json({ error: "Registro não encontrado." });
    await prisma.obligationCompletion.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;
