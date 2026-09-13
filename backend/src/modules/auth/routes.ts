import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseOrThrow } from "../../utils/validate";
import { requireAuth, signToken, AuthedRequest } from "../../middleware/auth";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../../data/defaultCategories";
import { DEFAULT_OBLIGATION_TYPES } from "../../data/defaultObligationTypes";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(registerSchema, req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        entities: { create: { name: "Pessoa Física", type: "PF" } },
      },
      include: { entities: true },
    });
    const entity = user.entities[0];

    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      await prisma.category.create({
        data: {
          entityId: entity.id,
          name: cat.name,
          type: "INCOME",
          isDefault: true,
          subcategories: { create: cat.subcategories.map((name) => ({ name })) },
        },
      });
    }
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await prisma.category.create({
        data: {
          entityId: entity.id,
          name: cat.name,
          type: "EXPENSE",
          expenseKind: cat.expenseKind as any,
          isDefault: true,
          subcategories: { create: cat.subcategories.map((name) => ({ name })) },
        },
      });
    }

    for (const type of DEFAULT_OBLIGATION_TYPES) {
      await prisma.obligationType.create({
        data: { ...type, userId: user.id, isDefault: true },
      });
    }

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      entity: { id: entity.id, name: entity.name, type: entity.type },
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(loginSchema, req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { entities: { orderBy: { createdAt: "asc" } } },
    });
    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      entity: user.entities[0]
        ? { id: user.entities[0].id, name: user.entities[0].name, type: user.entities[0].type }
        : null,
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const entities = await prisma.financialEntity.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "asc" },
    });
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      entities,
      activeEntityId: req.entityId,
    });
  })
);

export default router;
