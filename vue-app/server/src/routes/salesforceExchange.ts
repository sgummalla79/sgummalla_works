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
import { refreshAccessToken } from "../lib/sfBearerFlow.js";
import { upsertSfToken, getValidSfToken } from "../lib/sfTokenDb.js";

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
    private_key,
  } = req.body as Record<string, string>;

  if (!label || !client_id || !private_key) {
    res
      .status(400)
      .json({ error: "label, client_id, and private_key are required" });
    return;
  }

  if (
    !private_key.includes("-----BEGIN") ||
    !private_key.includes("PRIVATE KEY-----")
  ) {
    res
      .status(400)
      .json({ error: "private_key must be a PEM-encoded RSA private key" });
    return;
  }

  try {
    const [row] = await sql`
      INSERT INTO sf_clients (label, client_id, login_url, private_key, flow_type, user_id)
      VALUES (${label}, ${client_id}, ${login_url}, ${private_key}, 'token_exchange', ${userId})
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
  const { label, client_id, login_url, private_key } = req.body as Record<
    string,
    string | undefined
  >;

  if (!label && !client_id && !login_url && !private_key) {
    res.status(400).json({ error: "No fields provided to update" });
    return;
  }

  if (
    private_key !== undefined &&
    private_key !== "" &&
    (!private_key.includes("-----BEGIN") ||
      !private_key.includes("PRIVATE KEY-----"))
  ) {
    res
      .status(400)
      .json({ error: "private_key must be a PEM-encoded RSA private key" });
    return;
  }

  try {
    const [row] = await sql`
      UPDATE sf_clients SET
        label       = COALESCE(${label ?? null}, label),
        client_id   = COALESCE(${client_id ?? null}, client_id),
        login_url   = COALESCE(${login_url ?? null}, login_url),
        private_key = CASE WHEN ${private_key ?? ""} = '' THEN private_key ELSE ${private_key ?? ""} END
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
    const [tokenRow] = await sql`
      SELECT id_token FROM user_id_tokens WHERE user_id = ${userId}
    `;

    if (!tokenRow) {
      res.status(400).json({
        error:
          "No Auth0 token found. Please log out and log in again via Auth0.",
      });
      return;
    }

    const [client] = await sql`
      SELECT client_id, login_url FROM sf_clients WHERE id = ${id}
    `;

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const start = Date.now();
    const { access_token, instance_url, sf_username } =
      await exchangeWebAppToken(
        client.client_id as string,
        tokenRow.id_token as string,
        client.login_url as string,
      );

    const row = await upsertSfToken(id, sf_username, {
      access_token,
      instance_url,
    });
    emitSfOp("token_acquire", id, sf_username, userId, Date.now() - start, {
      fromCache: false,
    });
    res.json({ sf_username, ...row, from_cache: false });
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
    const [idTokenRow] = await sql`
      SELECT id_token FROM user_id_tokens WHERE user_id = ${userId}
    `;
    if (!idTokenRow) {
      res.status(400).json({
        error: "No Auth0 token found. Please log out and log in again.",
      });
      return;
    }
    logs.push({ step: "Auth0 identity token found", status: "ok" });

    // 2 — Client record
    const [clientRow] = await sql`
      SELECT id, label, client_id, login_url FROM sf_clients
      WHERE id = ${id} AND flow_type = 'token_exchange'
    `;
    if (!clientRow) {
      res.status(404).json({ error: "Token Exchange client not found" });
      return;
    }
    logs.push({ step: `Client loaded: ${clientRow.label}`, status: "ok" });

    // 3 — Always exchange fresh (cache cannot be used for frontdoor.jsp)
    logs.push({
      step: "Requesting fresh Salesforce session token",
      status: "info",
    });
    const result = await exchangeWebAppToken(
      clientRow.client_id as string,
      idTokenRow.id_token as string,
      clientRow.login_url as string,
    );
    await upsertSfToken(id, result.sf_username, result);
    logs.push({
      step: `Session token issued · ${result.sf_username}`,
      status: "ok",
    });

    // 4 — Construct FrontDoor URL
    const url = `${result.instance_url}/secur/frontdoor.jsp?sid=${encodeURIComponent(result.access_token)}&retURL=%2F`;
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
      const [client] = await sql`
        SELECT client_id, login_url FROM sf_clients WHERE id = ${id}
      `;

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const [saved] = await sql`
        SELECT refresh_token FROM sf_tokens
        WHERE client_db_id = ${id} AND sf_username = ${sf_username}
      `;

      let token: { access_token: string; instance_url: string };

      if (saved?.refresh_token) {
        try {
          token = await refreshAccessToken(
            saved.refresh_token as string,
            client.client_id as string,
            client.login_url as string,
          );
        } catch {
          // Refresh token expired — re-exchange using stored Auth0 id_token
          const [tokenRow] = await sql`
            SELECT id_token FROM user_id_tokens WHERE user_id = ${req.user!.id}
          `;
          if (!tokenRow)
            throw new Error("No Auth0 token — please log in again");
          const result = await exchangeWebAppToken(
            client.client_id as string,
            tokenRow.id_token as string,
            client.login_url as string,
          );
          token = result;
        }
      } else {
        const [tokenRow] = await sql`
          SELECT id_token FROM user_id_tokens WHERE user_id = ${req.user!.id}
        `;
        if (!tokenRow) throw new Error("No Auth0 token — please log in again");
        const result = await exchangeWebAppToken(
          client.client_id as string,
          tokenRow.id_token as string,
          client.login_url as string,
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
      res.json({ sf_username, ...row, from_cache: false });
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
    const [client] = await sql`
      SELECT client_id, login_url FROM sf_clients WHERE id = ${id}
    `;

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    let tokenRow = await getValidSfToken(id, sf_username);
    if (!tokenRow) {
      const [idTokenRow] = await sql`
        SELECT id_token FROM user_id_tokens WHERE user_id = ${req.user!.id}
      `;
      if (!idTokenRow) throw new Error("No Auth0 token — please log in again");
      const result = await exchangeWebAppToken(
        client.client_id as string,
        idTokenRow.id_token as string,
        client.login_url as string,
      );
      tokenRow = await upsertSfToken(id, result.sf_username, result);
    }

    const queryStart = Date.now();
    const queryUrl = `${tokenRow.instance_url}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;
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
