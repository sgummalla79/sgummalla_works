import { Router, type Request, type Response } from "express";
import { Issuer, type TokenSet, type UserinfoResponse } from "openid-client";
import {
  signToken,
  cookieOptions,
  getCookieName,
  signPendingLink,
  verifyPendingLink,
  getPendingLinkCookieName,
  type AuthUser,
  type SfAccount,
} from "../lib/jwt.js";
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
import sql from "../lib/db.js";

const router: import("express").Router = Router();

// ── Auth0 OIDC client ─────────────────────────────────────────────────────────

type Auth0Client = InstanceType<InstanceType<typeof Issuer>["Client"]>;
let auth0Client: Auth0Client | null = null;

async function getClient(): Promise<Auth0Client> {
  if (auth0Client) return auth0Client;

  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) throw new Error("AUTH0_DOMAIN is not set");

  const issuer = await Issuer.discover(`https://${domain}`);

  auth0Client = new issuer.Client({
    client_id: process.env.AUTH0_CLIENT_ID ?? "",
    client_secret: process.env.AUTH0_CLIENT_SECRET ?? "",
    redirect_uris: [
      process.env.AUTH0_CALLBACK_URL ??
        "http://localhost:3000/api/auth0/callback",
    ],
    response_types: ["code"],
  });

  return auth0Client;
}

// ── Management API helpers ────────────────────────────────────────────────────

const KNOWN_LABELS: Record<string, string> = {
  "google-oauth2": "Google",
  github: "GitHub",
  twitter: "Twitter",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  windowslive: "Microsoft",
  apple: "Apple",
};

interface MgmtTokenCache {
  token: string;
  expiresAt: number;
}

interface Auth0Connection {
  name: string;
  label: string;
  strategy: string;
}

interface ConnectionsCache {
  data: Auth0Connection[];
  expiresAt: number;
}

let mgmtTokenCache: MgmtTokenCache | null = null;
let connectionsCache: ConnectionsCache | null = null;

async function getMgmtToken(domain: string): Promise<string> {
  if (mgmtTokenCache && Date.now() < mgmtTokenCache.expiresAt) {
    return mgmtTokenCache.token;
  }

  const res = await loggedFetch(
    `https://${domain}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${domain}/api/v2/`,
      }),
    },
    "Auth0 Management API — get token",
  );

  if (!res.ok) throw new Error(`Management token fetch failed: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  mgmtTokenCache = {
    token: data.access_token,
    // Refresh 60s before actual expiry
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return mgmtTokenCache.token;
}

async function fetchConnections(): Promise<Auth0Connection[]> {
  if (connectionsCache && Date.now() < connectionsCache.expiresAt) {
    return connectionsCache.data;
  }

  const domain = process.env.AUTH0_DOMAIN!;
  const clientId = process.env.AUTH0_CLIENT_ID!;
  const token = await getMgmtToken(domain);

  const res = await loggedFetch(
    `https://${domain}/api/v2/connections?client_id=${encodeURIComponent(clientId)}&fields=name,strategy,display_name,enabled_clients`,
    { headers: { Authorization: `Bearer ${token}` } },
    "Auth0 Management API — fetch connections",
  );

  if (!res.ok) throw new Error(`Connections fetch failed: ${res.status}`);

  const raw = (await res.json()) as Array<{
    name: string;
    strategy: string;
    display_name?: string;
    enabled_clients: string[];
  }>;

  const data: Auth0Connection[] = raw
    // Skip Auth0's own username/password DB — the credential form already covers it
    .filter((c) => c.strategy !== "auth0")
    // Only include connections explicitly enabled for this client (mirrors what Auth0 Dashboard shows)
    .filter((c) => c.enabled_clients.includes(clientId))
    .map((c) => ({
      name: c.name,
      strategy: c.strategy,
      label:
        c.display_name ??
        KNOWN_LABELS[c.name] ??
        KNOWN_LABELS[c.strategy] ??
        c.name,
    }));

  // Cache for 1 hour
  connectionsCache = { data, expiresAt: Date.now() + 60 * 60 * 1000 };
  return data;
}

// ── GET /api/auth0/connections ────────────────────────────────────────────────

router.get("/connections", async (_req: Request, res: Response) => {
  try {
    const connections = await fetchConnections();
    res.json(connections);
  } catch (err) {
    res.json([]);
  }
});

// ── GET /api/auth0/initiate ───────────────────────────────────────────────────

router.get("/initiate", async (req: Request, res: Response) => {
  try {
    const client = await getClient();
    const connection = (req.query.connection as string) || undefined;
    // Request openid profile email — sf_accounts injected via Auth0 Action
    const url = client.authorizationUrl({
      scope: "openid profile email",
      ...(connection && { connection }),
    });
    res.redirect(url);
  } catch (err) {
    res.redirect("/login?error=auth0_unavailable");
  }
});

// ── GET /api/auth0/callback ───────────────────────────────────────────────────

router.get("/callback", async (req: Request, res: Response) => {
  try {
    const client = await getClient();
    const params = client.callbackParams(req);
    const callbackUrl =
      process.env.AUTH0_CALLBACK_URL ??
      "http://localhost:3000/api/auth0/callback";

    const tokenSet: TokenSet = await client.callback(callbackUrl, params);
    const userinfo: UserinfoResponse = await client.userinfo(tokenSet);

    // Auth0 Action injects sf_accounts as a custom claim
    const sfAccounts =
      (userinfo["sf_accounts"] as SfAccount[] | undefined) ?? [];

    const user: AuthUser = {
      id: userinfo.sub,
      email: (userinfo.email as string) ?? "",
      name:
        (userinfo.name as string) ??
        (userinfo.nickname as string) ??
        (userinfo.email as string) ??
        "",
      provider: "auth0",
      sfAccounts,
    };

    // Check for email conflict across providers
    if (userinfo.email) {
      try {
        const domain = process.env.AUTH0_DOMAIN!;
        const mgmtToken = await getMgmtToken(domain);
        const emailRes = await loggedFetch(
          `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(userinfo.email as string)}&fields=user_id,identities,created_at`,
          { headers: { Authorization: `Bearer ${mgmtToken}` } },
          "Auth0 Management API — users by email (conflict check)",
        );
        if (emailRes.ok) {
          const allUsers = (await emailRes.json()) as Array<{
            user_id: string;
            identities: Array<{ provider: string }>;
            created_at: string;
          }>;
          const others = allUsers.filter((u) => u.user_id !== userinfo.sub);
          if (others.length > 0) {
            const primary = others.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )[0];
            const currentSub = userinfo.sub as string;
            const pendingToken = signPendingLink({
              primaryUserId: primary.user_id,
              primaryProvider: primary.identities[0].provider,
              secondaryUserId: currentSub,
              secondaryProvider: currentSub.split("|")[0],
              email: userinfo.email as string,
            });
            res.cookie(getPendingLinkCookieName(), pendingToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 10 * 60 * 1000,
              path: "/",
            });
            res.redirect("/link-accounts");
            return;
          }
        }
      } catch (err) {
        // Non-fatal — fall through to normal login
      }
    }

    // Persist the Auth0 id_token for Token Exchange flow
    if (tokenSet.id_token) {
      await sql`
        INSERT INTO user_id_tokens (user_id, id_token)
        VALUES (${user.id}, ${tokenSet.id_token})
        ON CONFLICT (user_id) DO UPDATE SET
          id_token   = EXCLUDED.id_token,
          updated_at = now()
      `;
    }

    const token = signToken(user);
    res.cookie(getCookieName(), token, cookieOptions());
    emitAuth("login_success", req, {
      provider: user.id.split("|")[0],
      userId: user.id,
      email: user.email,
    });
    res.redirect("/auths");
  } catch (err) {
    emitAuth("login_failed", req, {
      provider: "auth0",
      error: err instanceof Error ? err.message : "auth0_failed",
    });
    res.redirect("/login?error=auth0_failed");
  }
});

// ── GET /api/auth0/pending-link ───────────────────────────────────────────────

router.get("/pending-link", (req: Request, res: Response) => {
  const token = req.cookies[getPendingLinkCookieName()] as string | undefined;
  if (!token) {
    res.status(404).json({ error: "No pending link" });
    return;
  }
  try {
    const data = verifyPendingLink(token);
    res.json({
      primaryProvider: data.primaryProvider,
      secondaryProvider: data.secondaryProvider,
      email: data.email,
    });
  } catch {
    res.status(404).json({ error: "No pending link" });
  }
});

// ── GET /api/auth0/link ───────────────────────────────────────────────────────

router.get("/link", async (req: Request, res: Response) => {
  const token = req.cookies[getPendingLinkCookieName()] as string | undefined;
  if (!token) {
    res.redirect("/login?error=link_expired");
    return;
  }

  res.clearCookie(getPendingLinkCookieName(), { path: "/" });

  try {
    const data = verifyPendingLink(token);
    const domain = process.env.AUTH0_DOMAIN!;
    const mgmtToken = await getMgmtToken(domain);

    if (req.query.action === "skip") {
      // Keep accounts separate — log in as the secondary (current) user
      const profileRes = await loggedFetch(
        `https://${domain}/api/v2/users/${encodeURIComponent(data.secondaryUserId)}`,
        { headers: { Authorization: `Bearer ${mgmtToken}` } },
        "Auth0 Management API — fetch secondary user profile",
      );
      if (!profileRes.ok) {
        res.redirect("/login?error=link_failed");
        return;
      }
      const profile = (await profileRes.json()) as {
        user_id: string;
        email?: string;
        name?: string;
        nickname?: string;
      };
      const user: AuthUser = {
        id: profile.user_id,
        email: profile.email ?? "",
        name: profile.name ?? profile.nickname ?? profile.email ?? "",
        provider: "auth0",
        sfAccounts: [],
      };
      const sessionToken = signToken(user);
      emitAuth("account_link_skipped", req, {
        userId: profile.user_id,
        email: data.email,
      });
      res.cookie(getCookieName(), sessionToken, cookieOptions());
      res.redirect("/auths");
      return;
    }

    // Link secondary identity into primary account
    const [secProvider, secUserId] = data.secondaryUserId.split("|");
    const linkRes = await loggedFetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(data.primaryUserId)}/identities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: secProvider, user_id: secUserId }),
      },
      "Auth0 Management API — link identities",
    );
    if (!linkRes.ok) {
      res.redirect("/login?error=link_failed");
      return;
    }

    // Fetch primary user profile to build the session
    const profileRes = await loggedFetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(data.primaryUserId)}`,
      { headers: { Authorization: `Bearer ${mgmtToken}` } },
      "Auth0 Management API — fetch primary user profile",
    );
    const profile = (await profileRes.json()) as {
      user_id: string;
      email?: string;
      name?: string;
      nickname?: string;
      app_metadata?: { sf_accounts?: SfAccount[] };
    };
    const user: AuthUser = {
      id: profile.user_id,
      email: profile.email ?? "",
      name: profile.name ?? profile.nickname ?? profile.email ?? "",
      provider: "auth0",
      sfAccounts: profile.app_metadata?.sf_accounts ?? [],
    };
    emitAuth("account_linked", req, { userId: user.id, email: user.email });
    const sessionToken = signToken(user);
    res.cookie(getCookieName(), sessionToken, cookieOptions());
    res.redirect("/auths");
  } catch (err) {
    emitAuth("login_failed", req, {
      error: err instanceof Error ? err.message : "link_failed",
    });
    res.clearCookie(getPendingLinkCookieName(), { path: "/" });
    res.redirect("/login?error=link_failed");
  }
});

export default router;
