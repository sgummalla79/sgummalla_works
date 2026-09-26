import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { appLogger, buildBase } from "../lib/logger.js";
import { LogRecordType } from "../lib/logTypes.js";
import type { LogRecord, SfOpName } from "../lib/logTypes.js";

function emitSfOp(
  operation: SfOpName,
  clientId: string,
  sfUsername: string,
  userId: string,
  durationMs: number,
  extra?: Record<string, unknown>,
): void {
  appLogger.emit({
    ...buildBase(LogRecordType.SFOP, extra?.["error"] ? "error" : "info"),
    logType: LogRecordType.SFOP,
    data: {
      operation,
      flowType: "token_exchange",
      clientId,
      sfUsername,
      userId,
      durationMs,
      ...extra,
    },
  } as LogRecord);
}
import sql from "../lib/db.js";
import { exchangeWebAppToken } from "../lib/sfTokenExchangeFlow.js";
import {
  getLightningOutConfig,
  requestLightningOutSession,
} from "../lib/sfLightningOut.js";
import { refreshAccessToken } from "../lib/sfBearerFlow.js";
import {
  upsertSfToken,
  getValidSfToken,
  getStoredRefreshToken,
} from "../lib/sfTokenDb.js";
import { getIdToken } from "../lib/idTokenRepository.js";
import { findOwnedExchangeClient } from "../lib/sfClientRepository.js";
import { requestFrontdoorUri } from "../lib/sfFrontdoor.js";
import { toPublicSfToken } from "../lib/sfTokenPresenter.js";
import { SINGLE_ACCESS_PATH } from "../lib/lightningOutConstants.js";
import { normalizeSalesforceOrigin } from "../lib/sfHostAllowlist.js";

// Same response for "missing" and "not yours" so ids cannot be probed.
const CLIENT_NOT_FOUND = "Client not found";

// Token Exchange forwards the user's Auth0 token and never signs anything, so
// these clients have no private key. sf_clients.private_key is NOT NULL because
// JWT Bearer clients share the table, hence the empty value.
const NO_PRIVATE_KEY = "";

const router: Router = Router();
router.use(requireAuth);

// ── GET /api/salesforce-exchange/clients ──────────────────────────────────────
// Reuses the same sf_clients table.

router.get("/clients", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const rows = await sql`
      SELECT id, label, client_id, login_url, created_at
      FROM sf_clients
      WHERE flow_type = 'token_exchange' AND user_id = ${userId}
      ORDER BY created_at DESC
    `;
    res.json({ clients: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch clients";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/salesforce-exchange/clients ────────────────────────────────────

router.post("/clients", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    label,
    client_id,
    login_url = "https://login.salesforce.com",
  } = req.body as Record<string, string>;

  if (!label || !client_id) {
    res.status(400).json({ error: "label and client_id are required" });
    return;
  }

  let loginOrigin: string;
  try {
    loginOrigin = normalizeSalesforceOrigin(login_url, "login_url");
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  try {
    const [row] = await sql`
      INSERT INTO sf_clients (label, client_id, login_url, private_key, flow_type, user_id)
      VALUES (${label}, ${client_id}, ${loginOrigin}, ${NO_PRIVATE_KEY}, 'token_exchange', ${userId})
      RETURNING id, label, client_id, login_url, created_at
    `;
    res.status(201).json(row);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to register client";
    res.status(500).json({ error: msg });
  }
});

// ── PATCH /api/salesforce-exchange/clients/:id ───────────────────────────────

router.patch("/clients/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { label, client_id, login_url } = req.body as Record<
    string,
    string | undefined
  >;

  if (!label && !client_id && !login_url) {
    res.status(400).json({ error: "No fields provided to update" });
    return;
  }

  let loginOrigin: string | undefined;
  if (login_url) {
    try {
      loginOrigin = normalizeSalesforceOrigin(login_url, "login_url");
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
  }

  try {
    const [row] = await sql`
      UPDATE sf_clients SET
        label       = COALESCE(${label ?? null}, label),
        client_id   = COALESCE(${client_id ?? null}, client_id),
        login_url   = COALESCE(${loginOrigin ?? null}, login_url)
      WHERE id = ${id} AND flow_type = 'token_exchange' AND user_id = ${userId}
      RETURNING id, label, client_id, login_url, created_at
    `;

    if (!row) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    await sql`DELETE FROM sf_tokens WHERE client_db_id = ${id}`;
    res.json(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update client";
    res.status(500).json({ error: msg });
  }
});

// ── DELETE /api/salesforce-exchange/clients/:id ──────────────────────────────

router.delete("/clients/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const [row] = await sql`
      DELETE FROM sf_clients
      WHERE id = ${id} AND flow_type = 'token_exchange' AND user_id = ${userId}
      RETURNING id
    `;
    if (!row) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete client";
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/salesforce-exchange/clients/:id/tokens ───────────────────────────

router.get("/clients/:id/tokens", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (!(await findOwnedExchangeClient(id, req.user!.id))) {
      res.status(404).json({ error: CLIENT_NOT_FOUND });
      return;
    }
    const rows = await sql`
      SELECT sf_username, instance_url, issued_at,
             (refresh_token IS NOT NULL) AS has_refresh_token
      FROM sf_tokens
      WHERE client_db_id = ${id}
      ORDER BY issued_at DESC
    `;
    res.json({ tokens: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch tokens";
    res.status(500).json({ error: msg });
  }
});

// ── DELETE /api/salesforce-exchange/clients/:id/tokens/:sf_username ──────────
// Wipes the cached access_token and refresh_token for one user under a client.

router.delete(
  "/clients/:id/tokens/:sf_username",
  async (req: Request, res: Response) => {
    const { id, sf_username } = req.params;
    try {
      if (!(await findOwnedExchangeClient(id, req.user!.id))) {
        res.status(404).json({ error: CLIENT_NOT_FOUND });
        return;
      }
      const [row] = await sql`
        DELETE FROM sf_tokens
        WHERE client_db_id = ${id} AND sf_username = ${sf_username}
        RETURNING sf_username
      `;
      if (!row) {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete token";
      res.status(500).json({ error: msg });
    }
  },
);

// ── POST /api/salesforce-exchange/clients/:id/token ───────────────────────────
// True Token Exchange: forwards the Auth0 id_token stored at login directly to
// Salesforce. No JWT minting — the token already exists from the user's login.

router.post("/clients/:id/token", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "No authenticated user" });
    return;
  }

  try {
    // Retrieve the Auth0 id_token saved at login
    const idToken = await getIdToken(userId);

    if (!idToken) {
      res.status(400).json({
        error:
          "No Auth0 token found. Please log out and log in again via Auth0.",
      });
      return;
    }

    const client = await findOwnedExchangeClient(id, userId);

    if (!client) {
      res.status(404).json({ error: CLIENT_NOT_FOUND });
      return;
    }

    const start = Date.now();
    const { access_token, instance_url, sf_username } =
      await exchangeWebAppToken(client.client_id, idToken, client.login_url);

    const row = await upsertSfToken(id, sf_username, {
      access_token,
      instance_url,
    });
    emitSfOp("token_acquire", id, sf_username, userId, Date.now() - start, {
      fromCache: false,
    });
    res.json(toPublicSfToken(sf_username, row, false));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token exchange failed";
    res.status(400).json({ error: msg });
  }
});

// ── GET /api/salesforce-exchange/clients/:id/frontdoor ───────────────────────
// Always performs a fresh token exchange — never uses the cache.
// frontdoor.jsp validates the SID against a live Salesforce session; a stale
// or previously-used token causes a redirect to the login screen, so we must
// mint a new access_token for every FrontDoor request.

type LogEntry = { step: string; status: "ok" | "cached" | "info" };

router.get("/clients/:id/frontdoor", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "No authenticated user" });
    return;
  }

  const logs: LogEntry[] = [];

  try {
    // 1 — Auth0 identity token
    const idToken = await getIdToken(userId);
    if (!idToken) {
      res.status(400).json({
        error: "No Auth0 token found. Please log out and log in again.",
      });
      return;
    }
    logs.push({ step: "Auth0 identity token found", status: "ok" });

    // 2 — Client record
    const clientRow = await findOwnedExchangeClient(id, userId);
    if (!clientRow) {
      res.status(404).json({ error: CLIENT_NOT_FOUND });
      return;
    }
    logs.push({ step: `Client loaded: ${clientRow.label}`, status: "ok" });

    // 3 — Always exchange fresh (cache cannot be used for frontdoor.jsp)
    logs.push({
      step: "Requesting fresh Salesforce session token",
      status: "info",
    });
    const result = await exchangeWebAppToken(
      clientRow.client_id,
      idToken,
      clientRow.login_url,
    );
    await upsertSfToken(id, result.sf_username, result);
    logs.push({
      step: `Session token issued · ${result.sf_username}`,
      status: "ok",
    });

    // 4 — Trade the token for a single-use frontdoor URL (server-to-server), so
    // no access token ever appears in a URL the browser sees or stores.
    const url = await requestFrontdoorUri(
      result.instance_url,
      SINGLE_ACCESS_PATH,
      result.access_token,
    );
    logs.push({
      step: "FrontDoor URL ready — opening Salesforce",
      status: "ok",
    });

    res.json({ url, logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "FrontDoor request failed";
    res.status(400).json({ error: msg });
  }
});

// ── GET /api/salesforce-exchange/clients/:id/lightning-out ───────────────────
// Fresh token exchange, then a Lightning Out 2.0 frontdoor URL for the
// configured Lightning Out app. The browser never sees the access token.

router.get(
  "/clients/:id/lightning-out",
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "No authenticated user" });
      return;
    }

    const logs: LogEntry[] = [];

    try {
      const config = getLightningOutConfig();

      const idToken = await getIdToken(userId);
      if (!idToken) {
        res.status(400).json({
          error: "No Auth0 token found. Please log out and log in again.",
        });
        return;
      }
      logs.push({ step: "Auth0 identity token found", status: "ok" });

      const clientRow = await findOwnedExchangeClient(id, userId);
      if (!clientRow) {
        res.status(404).json({ error: CLIENT_NOT_FOUND });
        return;
      }
      logs.push({ step: `Client loaded: ${clientRow.label}`, status: "ok" });

      const result = await exchangeWebAppToken(
        clientRow.client_id,
        idToken,
        clientRow.login_url,
      );
      await upsertSfToken(id, result.sf_username, result);
      logs.push({
        step: `Session token issued · ${result.sf_username}`,
        status: "ok",
      });

      const session = await requestLightningOutSession(
        result.instance_url,
        result.access_token,
        config,
      );
      logs.push({ step: "Lightning Out session ready", status: "ok" });

      res.json({ ...session, logs });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Lightning Out request failed";
      res.status(400).json({ error: msg });
    }
  },
);

// ── POST /api/salesforce-exchange/clients/:id/token/refresh ──────────────────

router.post(
  "/clients/:id/token/refresh",
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sf_username } = req.body as { sf_username?: string };

    if (!sf_username) {
      res.status(400).json({ error: "sf_username is required" });
      return;
    }

    try {
      const client = await findOwnedExchangeClient(id, req.user!.id);

      if (!client) {
        res.status(404).json({ error: CLIENT_NOT_FOUND });
        return;
      }

      const savedRefreshToken = await getStoredRefreshToken(id, sf_username);

      let token: { access_token: string; instance_url: string };

      if (savedRefreshToken) {
        try {
          token = await refreshAccessToken(
            savedRefreshToken,
            client.client_id,
            normalizeSalesforceOrigin(client.login_url, "login_url"),
          );
        } catch {
          // Refresh token expired — re-exchange using stored Auth0 id_token
          const idToken = await getIdToken(req.user!.id);
          if (!idToken) throw new Error("No Auth0 token — please log in again");
          const result = await exchangeWebAppToken(
            client.client_id,
            idToken,
            client.login_url,
          );
          token = result;
        }
      } else {
        const idToken = await getIdToken(req.user!.id);
        if (!idToken) throw new Error("No Auth0 token — please log in again");
        const result = await exchangeWebAppToken(
          client.client_id,
          idToken,
          client.login_url,
        );
        token = result;
      }

      const start = Date.now();
      const row = await upsertSfToken(id, sf_username, token);
      emitSfOp(
        "token_refresh",
        id,
        sf_username,
        req.user!.id,
        Date.now() - start,
        { fromCache: false },
      );
      res.json(toPublicSfToken(sf_username, row, false));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token refresh failed";
      res.status(400).json({ error: msg });
    }
  },
);

// ── POST /api/salesforce-exchange/clients/:id/query ──────────────────────────

router.post("/clients/:id/query", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sf_username, soql } = req.body as {
    sf_username?: string;
    soql?: string;
  };

  if (!sf_username || !soql?.trim()) {
    res.status(400).json({ error: "sf_username and soql are required" });
    return;
  }

  try {
    const client = await findOwnedExchangeClient(id, req.user!.id);

    if (!client) {
      res.status(404).json({ error: CLIENT_NOT_FOUND });
      return;
    }

    let tokenRow = await getValidSfToken(id, sf_username);
    if (!tokenRow) {
      const idToken = await getIdToken(req.user!.id);
      if (!idToken) throw new Error("No Auth0 token — please log in again");
      const result = await exchangeWebAppToken(
        client.client_id,
        idToken,
        client.login_url,
      );
      tokenRow = await upsertSfToken(id, result.sf_username, result);
    }

    const queryStart = Date.now();
    const instanceOrigin = normalizeSalesforceOrigin(
      tokenRow.instance_url as string,
      "instance_url",
    );
    const queryUrl = `${instanceOrigin}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;
    const sfRes = await fetch(queryUrl, {
      redirect: "error",
      headers: { Authorization: `Bearer ${tokenRow.access_token}` },
    });

    const text = await sfRes.text();
    if (!sfRes.ok) {
      let msg = `Query failed (HTTP ${sfRes.status})`;
      try {
        const p = JSON.parse(text);
        if (Array.isArray(p) && p[0]?.message) msg = p[0].message;
        else if (p.message) msg = p.message;
      } catch {
        /* ignore */
      }
      emitSfOp(
        "soql_query",
        id,
        sf_username,
        req.user!.id,
        Date.now() - queryStart,
        { query: soql, error: msg },
      );
      res.status(400).json({ error: msg });
      return;
    }

    const data = JSON.parse(text) as {
      records: Record<string, unknown>[];
      totalSize: number;
      done: boolean;
    };
    emitSfOp(
      "soql_query",
      id,
      sf_username,
      req.user!.id,
      Date.now() - queryStart,
      { query: soql, rowCount: data.totalSize },
    );
    res.json({
      records: data.records,
      totalSize: data.totalSize,
      done: data.done,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Query failed";
    res.status(400).json({ error: msg });
  }
});

export default router;
