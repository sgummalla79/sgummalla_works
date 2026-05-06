import type { Request, Response, NextFunction } from "express";

export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ownerId = process.env.OWNER_USER_ID;
  if (!ownerId || req.user?.id !== ownerId) {
    res
      .status(403)
      .json({ error: "Forbidden", message: "Owner access required" });
    return;
  }
  next();
}
