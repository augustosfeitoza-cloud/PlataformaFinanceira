import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface AuthedRequest extends Request {
  userId?: string;
  entityId?: string;
}

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

// Resolves the acting FinancialEntity for the request. A user may hold
// several entities in the future (e.g. one PF + one PJ); for now we default
// to their first entity, but already support an explicit X-Entity-Id header
// so the frontend can add an entity switcher without any backend changes.
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

    const requestedEntityId = req.header("X-Entity-Id");
    const entity = requestedEntityId
      ? await prisma.financialEntity.findFirst({
          where: { id: requestedEntityId, userId: payload.userId },
        })
      : await prisma.financialEntity.findFirst({
          where: { userId: payload.userId },
          orderBy: { createdAt: "asc" },
        });

    if (!entity) {
      return res.status(401).json({ error: "Entidade financeira não encontrada." });
    }

    req.userId = payload.userId;
    req.entityId = entity.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}
