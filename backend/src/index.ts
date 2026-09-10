import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./modules/auth/routes";
import accountRoutes from "./modules/accounts/routes";
import categoryRoutes from "./modules/categories/routes";
import transactionRoutes from "./modules/transactions/routes";
import investmentRoutes from "./modules/investments/routes";
import goalRoutes from "./modules/goals/routes";
import budgetRoutes from "./modules/budgets/routes";
import reportRoutes from "./modules/reports/routes";
import { ValidationError } from "./utils/validate";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/reports", reportRoutes);

// Centralized error handler: turns ValidationError and unexpected errors
// into consistent JSON responses instead of leaking stack traces.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: "Dados inválidos.", issues: err.issues });
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const port = Number(process.env.PORT) || 3333;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
