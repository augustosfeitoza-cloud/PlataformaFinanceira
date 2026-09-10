import { ZodSchema } from "zod";

export class ValidationError extends Error {
  issues: unknown;
  constructor(issues: unknown) {
    super("Dados inválidos.");
    this.issues = issues;
  }
}

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }
  return result.data;
}
