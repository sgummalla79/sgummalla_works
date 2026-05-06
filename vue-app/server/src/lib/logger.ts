import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { LogRecord, LogSink } from "./logTypes.js";
import { LogRecordType } from "./logTypes.js";

export type { LogSink };

// ── Request context — correlationId + sessionId via AsyncLocalStorage ─────────

interface RequestCtx {
  correlationId: string;
  sessionId: string;
  timezone: string;
}
export const requestContext = new AsyncLocalStorage<RequestCtx>();

export function getRequestContext(): RequestCtx {
  return (
    requestContext.getStore() ?? {
      correlationId: randomUUID(),
      sessionId: "unknown",
      timezone: "UTC",
    }
  );
}

// ── Injectable Logger ─────────────────────────────────────────────────────────

class Logger {
  private sinks = new Map<string, LogSink>();

  register(sink: LogSink): void {
    this.sinks.set(sink.name, sink);
  }
  unregister(name: string): void {
    this.sinks.delete(name);
  }

  emit(record: LogRecord): void {
    for (const sink of this.sinks.values()) {
      Promise.resolve(sink.write(record)).catch((err) =>
        console.error(`[Logger] sink "${sink.name}" failed:`, err),
      );
    }
  }
}

export const appLogger = new Logger();

// ── Base record builder ───────────────────────────────────────────────────────

export function buildBase(
  logType: LogRecordType,
  level: "info" | "warn" | "error" = "info",
): Omit<LogRecord, "data"> {
  const ctx = getRequestContext();
  const now = new Date();
  return {
    logType,
    level,
    timestamp: now,
    createdAt: now,
    expireAt: now, // FirestoreSink overrides with correct TTL
    timezone: ctx.timezone,
    env: process.env.NODE_ENV === "production" ? "production" : "development",
    sessionId: ctx.sessionId,
    correlationId: ctx.correlationId,
  } as Omit<LogRecord, "data">;
}

// ── loggedFetch — emits APIOUT on every outgoing HTTP call ────────────────────

export async function loggedFetch(
  url: string,
  options?: RequestInit,
  context?: string,
): Promise<Response> {
  const method = (options?.method ?? "GET").toUpperCase();
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    appLogger.emit({
      ...buildBase(LogRecordType.APIOUT, res.ok ? "info" : "warn"),
      logType: LogRecordType.APIOUT,
      data: {
        method,
        url,
        status: res.status,
        durationMs: Date.now() - start,
        context: context ?? "",
      },
    } as LogRecord);
    return res;
  } catch (err) {
    appLogger.emit({
      ...buildBase(LogRecordType.APIOUT, "error"),
      logType: LogRecordType.APIOUT,
      data: {
        method,
        url,
        durationMs: Date.now() - start,
        context: context ?? "",
        error: err instanceof Error ? err.message : String(err),
      },
    } as LogRecord);
    throw err;
  }
}

// ── Legacy verbose logger (SAML / OIDC flow traces) — dev only ───────────────

const isDevEnv =
  process.env.LOG_LEVEL === "debug" || process.env.NODE_ENV === "development";

function fmt(label: string, data: Record<string, unknown>): void {
  if (!isDevEnv) return;
  process.stdout.write(`\n${"─".repeat(60)}\n`);
  process.stdout.write(`[DEV] ${label}\n`);
  process.stdout.write("─".repeat(60) + "\n");
  for (const [key, val] of Object.entries(data)) {
    const display =
      typeof val === "object"
        ? JSON.stringify(val, null, 2)
        : String(val ?? "—");
    process.stdout.write(`  ${key.padEnd(28)} ${display}\n`);
  }
  process.stdout.write("─".repeat(60) + "\n\n");
}

export const logger = {
  samlRequest(data: {
    requestId: string;
    spEntityId: string;
    acsUrl: string;
    userEmail: string;
    userName: string;
    idpEntityId: string;
  }) {
    fmt("SAML SSO — Assertion sent to Salesforce", {
      "📥 SP Entity ID": data.spEntityId,
      "📥 ACS URL": data.acsUrl,
      "📤 IDP Entity ID": data.idpEntityId,
      "📤 NameID (email)": data.userEmail,
      "📤 Attribute: email": data.userEmail,
      "📤 Attribute: firstName": data.userName.split(" ")[0] ?? data.userName,
      "📤 Attribute: lastName":
        data.userName.split(" ").slice(1).join(" ") ||
        data.userName.split(" ")[0],
      "📤 Attribute: username": data.userEmail,
      "🔑 Request ID": data.requestId,
    });
  },

  oidcAuthorize(data: {
    clientId: string;
    redirectUri: string;
    userEmail: string;
    userName: string;
    code: string;
    state?: string;
  }) {
    fmt("OIDC Authorize — Code issued to Salesforce", {
      "📥 Client ID": data.clientId,
      "📥 Redirect URI": data.redirectUri,
      "📥 State": data.state ?? "—",
      "📤 Auth Code (first 8 chars)": data.code.slice(0, 8) + "...",
      "👤 User Email": data.userEmail,
      "👤 User Name": data.userName,
    });
  },

  oidcToken(data: {
    clientId: string;
    userEmail: string;
    userName: string;
    grantType: string;
  }) {
    fmt("OIDC Token — Tokens issued to Salesforce", {
      "📥 Client ID": data.clientId,
      "📥 Grant Type": data.grantType,
      "📤 token_type": "Bearer",
      "📤 scope": "openid profile email",
      "📤 expires_in": "3600",
      "👤 id_token.sub": data.userEmail,
      "👤 id_token.email": data.userEmail,
      "👤 id_token.name": data.userName,
      "👤 id_token.given_name": data.userName.split(" ")[0] ?? data.userName,
      "👤 id_token.family_name":
        data.userName.split(" ").slice(1).join(" ") ||
        data.userName.split(" ")[0],
      "👤 id_token.email_verified": "true",
    });
  },

  oidcUserinfo(data: {
    sub: string;
    email: string;
    name: string;
    givenName: string;
    familyName: string;
  }) {
    fmt("OIDC Userinfo — Profile sent to Salesforce", {
      "📤 sub": data.sub,
      "📤 email": data.email,
      "📤 email_verified": "true",
      "📤 name": data.name,
      "📤 given_name": data.givenName,
      "📤 family_name": data.familyName,
    });
  },

  error(source: string, err: unknown) {
    if (!isDevEnv) return;
    process.stderr.write(`\n[DEV ERROR] ${source}\n`);
    process.stderr.write(String(err) + "\n\n");
  },

  debug(source: string, data: Record<string, unknown>) {
    fmt(`DEBUG — ${source}`, data);
  },
};
