import { saveIdToken, getIdToken } from "../lib/idTokenRepository.js";
import { endSalesforceSessions } from "../lib/sfSessionEnd.js";
import { Router, type Request } from "express";
import {
  signToken,
  cookieOptions,
  getCookieName,
  verifyToken,
  type AuthUser,
  type SfAccount,
} from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { loggedFetch, appLogger, buildBase } from "../lib/logger.js";
import { LogRecordType } from "../lib/logTypes.js";
import type { LogRecord, AuthEventName } from "../lib/logTypes.js";

function emitAuth(
  event: AuthEventName,
  req: import("express").Request,
  extra?: Partial<import("../lib/logTypes.js").AuthEventData>,
): void {
  appLogger.emit({
    ...buildBase(
      LogRecordType.AUTHEVENT,
      event.endsWith("failed") ? "warn" : "info",
    ),
    logType: LogRecordType.AUTHEVENT,
    data: {
      event,
      ip:
        (req.headers["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim() ?? req.ip,
      userAgent: req.headers["user-agent"],
      ...extra,
    },
  } as LogRecord);
}

const router: import("express").Router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoginBody {
  email: string;
  password: string;
}

// ── Auth0 Resource Owner Password Grant ───────────────────────────────────────

async function loginWithAuth0(
  email: string,
  password: string,
): Promise<{ user: AuthUser; idToken: string | undefined }> {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error("Auth0 is not configured");
  }

  const tokenRes = await loggedFetch(
    `https://${domain}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        username: email,
        password,
        client_id: clientId,
        client_secret: clientSecret,
        scope: "openid profile email",
        connection: "Username-Password-Authentication",
      }),
    },
    "Auth0 — ROPC token request",
  );

  if (!tokenRes.ok) {
    const err = (await tokenRes.json().catch(() => ({}))) as {
      error_description?: string;
    };
    throw new Error(err.error_description ?? "Invalid email or password");
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    id_token?: string;
  };

  const userinfoRes = await loggedFetch(
    `https://${domain}/userinfo`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    "Auth0 — fetch userinfo",
  );

  if (!userinfoRes.ok) throw new Error("Failed to retrieve user info");

  const userinfo = (await userinfoRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    nickname?: string;
    sf_accounts?: SfAccount[];
  };

  const user: AuthUser = {
    id: userinfo.sub,
    email: userinfo.email ?? "",
    name: userinfo.name ?? userinfo.nickname ?? userinfo.email ?? "",
    provider: "auth0",
    sfAccounts: userinfo.sf_accounts ?? [],
  };

  return { user, idToken: tokens.id_token };
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post(
  "/login",
  validate({
    email: { type: "email", required: true, maxLength: 254 },
    password: { type: "string", required: true, minLength: 1, maxLength: 128 },
  }),
  async (req, res) => {
    const { email, password } = req.body as LoginBody;

    try {
      const { user, idToken } = await loginWithAuth0(email, password);

      if (idToken) {
        await saveIdToken(user.id, idToken);
      }

      const token = signToken(user);
      res.cookie(getCookieName(), token, cookieOptions());
      emitAuth("login_success", req, {
        provider: "auth0",
        userId: user.id,
        email: user.email,
      });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          provider: user.provider,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      emitAuth("login_failed", req, {
        provider: "auth0",
        email,
        error: message,
      });
      res.status(401).json({ error: "Unauthorized", message });
    }
  },
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

// Logout is reachable without a valid session (an expired cookie must still be
// clearable), so the user is read from the cookie when it is still valid.
function userIdFromSessionCookie(req: Request): string | undefined {
  const token = req.cookies?.[getCookieName()] as string | undefined;
  if (!token) return undefined;
  try {
    return verifyToken(token).sub;
  } catch {
    return undefined;
  }
}

router.post("/logout", async (req, res) => {
  const userId = userIdFromSessionCookie(req);
  emitAuth("logout", req, { userId });

  // End the Salesforce session too, otherwise the next person to sign in on this
  // browser inherits it (Lightning Out keeps the previous user's session).
  const salesforceLogoutUrls = userId
    ? await endSalesforceSessions(userId).catch(() => [])
    : [];

  res.clearCookie(getCookieName(), { path: "/" });
  res.json({ message: "Logged out successfully", salesforceLogoutUrls });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get("/me", requireAuth, (_req, res) => {
  res.json({ user: _req.user });
});

// ── GET /api/auth/id-token ────────────────────────────────────────────────────

router.get("/id-token", requireAuth, async (req, res) => {
  const idToken = await getIdToken(req.user!.id);
  if (!idToken) {
    res.status(404).json({ error: "No ID token found" });
    return;
  }
  res.json({ idToken });
});

export default router;
