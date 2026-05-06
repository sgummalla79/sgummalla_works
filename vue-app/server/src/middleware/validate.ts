import type { Request, Response, NextFunction } from "express";

// ── Types ─────────────────────────────────────────────────────────────────────

type FieldRule = {
  type: "string" | "email";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

type Schema = Record<string, FieldRule>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function validate(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};
    const body = req.body as Record<string, unknown>;

    for (const [field, rule] of Object.entries(schema)) {
      const value = body[field];

      if (rule.required && (value === undefined || value === "")) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (value === undefined || value === "") continue;

      if (typeof value !== "string") {
        errors[field] = `${field} must be a string`;
        continue;
      }

      if (rule.type === "email" && !isEmail(value)) {
        errors[field] = `${field} must be a valid email address`;
        continue;
      }

      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors[field] =
          `${field} must be at least ${rule.minLength} characters`;
        continue;
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors[field] = `${field} must be at most ${rule.maxLength} characters`;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: "Validation failed", fields: errors });
      return;
    }

    next();
  };
}
