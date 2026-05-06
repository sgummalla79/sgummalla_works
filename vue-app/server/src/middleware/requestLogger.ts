import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { requestContext, appLogger, buildBase } from "../lib/logger.js";
import { LogRecordType } from "../lib/logTypes.js";
import type { LogRecord } from "../lib/logTypes.js";

function deriveSessionId(req: Request): string {
  const userId = req.user?.id;
  if (userId) {
    // Authenticated: hash the JWT cookie so sessionId rotates on re-login
    const cookie = req.cookies?.[process.env.JWT_COOKIE_NAME ?? "sgw_token"] as
      | string
      | undefined;
    return createHash("sha256")
      .update(cookie ?? userId)
      .digest("hex")
      .slice(0, 32);
  }
  // Unauthenticated: hash ip + userAgent + calendar date (UTC)
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ??
    req.ip ??
    "";
  const ua = req.headers["user-agent"] ?? "";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${ip}|${ua}|${day}`)
    .digest("hex")
    .slice(0, 32);
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const correlationId = randomUUID();
  const sessionId = deriveSessionId(req);
  const timezone =
    (req.headers["intl-timezone"] as string | undefined) ?? "UTC";
  const start = Date.now();

  requestContext.run({ correlationId, sessionId, timezone }, () => {
    res.on("finish", () => {
      appLogger.emit({
        ...buildBase(
          LogRecordType.APIIN,
          res.statusCode >= 500
            ? "error"
            : res.statusCode >= 400
              ? "warn"
              : "info",
        ),
        logType: LogRecordType.APIIN,
        data: {
          method: req.method,
          url: req.originalUrl,
          route: (req.route?.path as string | undefined) ?? req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
          userId: req.user?.id,
          ip:
            (req.headers["x-forwarded-for"] as string | undefined)
              ?.split(",")[0]
              ?.trim() ?? req.ip,
          userAgent: req.headers["user-agent"],
        },
      } as LogRecord);
    });

    next();
  });
}
