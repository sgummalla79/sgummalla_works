import type { Request, Response, NextFunction } from "express";
import { verifyToken, getCookieName, type AuthUser } from "../lib/jwt.js";

// ── Extend Express Request with authenticated user ────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies[getCookieName()] as string | undefined;

  if (!token) {
    res
      .status(401)
      .json({ error: "Unauthorized", message: "No session token found" });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
      sfAccounts: payload.sfAccounts ?? [],
    };
    next();
  } catch {
    res.clearCookie(getCookieName());
    res
      .status(401)
      .json({ error: "Unauthorized", message: "Session expired or invalid" });
  }
}
