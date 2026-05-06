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
      flowType: "jwt_bearer",
      clientId,
      sfUsername,
      userId,
      durationMs,
      ...extra,
    },
  } as LogRecord);
}
import sql from "../lib/db.js";
import {
  mintAndExchangeJWT,
  refreshAccessToken,
  type SfTokenResponse,
} from "../lib/sfBearerFlow.js";
import { upsertSfToken, getValidSfToken } from "../lib/sfTokenDb.js";

const router: Router = Router();
router.use(requireAuth);

// ── GET /api/salesforce/clients ───────────────────────────────────────────────

router.get("/clients", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const rows = await sql`
      SELECT id, label, client_id, login_url, created_at
      FROM sf_clients
      WHERE flow_type = 'jwt_bearer' AND user_id = ${userId}
      ORDER BY created_at DESC
    `;
    res.json({ clients: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch clients";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/salesforce/clients ──────────────────────────────────────────────

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
      VALUES (${label}, ${client_id}, ${login_url}, ${private_key}, 'jwt_bearer', ${userId})
      RETURNING id, label, client_id, login_url, created_at
    `;
    res.status(201).json(row);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to register client";
    res.status(500).json({ error: msg });
  }
});

// ── PATCH /api/salesforce/clients/:id ────────────────────────────────────────

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
    const [existing] =
      await sql`SELECT client_id FROM sf_clients WHERE id = ${id} AND user_id = ${userId}`;

    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const [row] = await sql`
      UPDATE sf_clients SET
        label       = COALESCE(${label ?? null}, label),
        client_id   = COALESCE(${client_id ?? null}, client_id),
        login_url   = COALESCE(${login_url ?? null}, login_url),
        private_key = CASE
          WHEN ${private_key ?? ""} = '' THEN private_key
          ELSE ${private_key ?? ""}
        END
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id, label, client_id, login_url, created_at
    `;

    // Invalidate saved tokens for this client when credentials change
    await sql`DELETE FROM sf_tokens WHERE client_db_id = ${id}`;

    res.json(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update client";
    res.status(500).json({ error: msg });
  }
});

// ── DELETE /api/salesforce/clients/:id ───────────────────────────────────────

router.delete("/clients/:id", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    const [row] = await sql`
      DELETE FROM sf_clients WHERE id = ${id} AND user_id = ${userId} RETURNING client_id
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

// ── Local alias ───────────────────────────────────────────────────────────────

const upsertToken = (
  clientDbId: string,
  sfUsername: string,
  token: SfTokenResponse,
) => upsertSfToken(clientDbId, sfUsername, token);

// ── GET /api/salesforce/clients/:id/tokens ───────────────────────────────────
// List all users who have obtained tokens under this client.

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

// ── DELETE /api/salesforce/clients/:id/tokens/:sf_username ──────────────────
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

// ── POST /api/salesforce/clients/:id/token ────────────────────────────────────
// Returns the saved token if not expired, otherwise mints a new one.

router.post("/clients/:id/token", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sf_username } = req.body as { sf_username?: string };

  if (!sf_username) {
    res.status(400).json({ error: "sf_username is required" });
    return;
  }

  try {
    const [client] = await sql`
      SELECT client_id, login_url, private_key FROM sf_clients WHERE id = ${id}
    `;

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const start = Date.now();
    // Return saved token if issued within the last 90 minutes
    const saved = await getValidSfToken(id, sf_username);
    if (saved) {
      emitSfOp(
        "token_cached",
        id,
        sf_username,
        req.user!.id,
        Date.now() - start,
        { fromCache: true },
      );
      res.json({ sf_username, ...saved, from_cache: true });
      return;
    }

    // Mint fresh token via JWT Bearer
    const token = await mintAndExchangeJWT(
      client.client_id as string,
      sf_username,
      client.login_url as string,
      client.private_key as string,
    );

    emitSfOp(
      "token_acquire",
      id,
      sf_username,
      req.user!.id,
      Date.now() - start,
      { fromCache: false },
    );
    const row = await upsertToken(id, sf_username, token);
    res.json({ sf_username, ...row, from_cache: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token exchange failed";
    res.status(400).json({ error: msg });
  }
});

// ── POST /api/salesforce/clients/:id/token/refresh ───────────────────────────
// Forces a new token — uses saved refresh_token if available, re-mints JWT otherwise.

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
      SELECT client_id, login_url, private_key FROM sf_clients WHERE id = ${id}
    `;

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const [saved] = await sql`
      SELECT refresh_token FROM sf_tokens
      WHERE client_db_id = ${id} AND sf_username = ${sf_username}
    `;

      let token: SfTokenResponse;

      if (saved?.refresh_token) {
        try {
          token = await refreshAccessToken(
            saved.refresh_token as string,
            client.client_id as string,
            client.login_url as string,
          );
        } catch {
          // Refresh token expired or revoked — fall back to JWT re-mint
          token = await mintAndExchangeJWT(
            client.client_id as string,
            sf_username,
            client.login_url as string,
            client.private_key as string,
          );
        }
      } else {
        token = await mintAndExchangeJWT(
          client.client_id as string,
          sf_username,
          client.login_url as string,
          client.private_key as string,
        );
      }

      const row = await upsertToken(id, sf_username, token);
      res.json({ sf_username, ...row, from_cache: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token refresh failed";
      res.status(400).json({ error: msg });
    }
  },
);

// ── POST /api/salesforce/clients/:id/query ────────────────────────────────────

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
      SELECT client_id, login_url, private_key FROM sf_clients WHERE id = ${id}
    `;

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    // Use cached token or mint fresh
    let tokenRow = await getValidSfToken(id, sf_username);
    if (!tokenRow) {
      const token = await mintAndExchangeJWT(
        client.client_id as string,
        sf_username,
        client.login_url as string,
        client.private_key as string,
      );
      tokenRow = await upsertToken(id, sf_username, token);
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
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed[0]?.message)
          msg = parsed[0].message;
        else if (typeof parsed === "object" && parsed.message)
          msg = parsed.message;
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
