// ── LogSink interface — defined here to avoid circular imports ────────────────

export interface LogSink {
  name: string;
  write(record: LogRecord): Promise<void> | void;
}

// ── LogRecordType enum ────────────────────────────────────────────────────────

export enum LogRecordType {
  APIIN = "apiin",
  APIOUT = "apiout",
  PAGEVIEW = "pageview",
  BLOGVIEW = "blogview",
  ARTVIEW = "artview",
  AUTHEVENT = "authevent",
  SFOP = "sfop",
  APPERROR = "apperror",
}

// ── DateTime alias — always UTC ───────────────────────────────────────────────

export type DateTime = Date;

// ── Base model — every record carries this ────────────────────────────────────

export interface BaseLogRecord {
  logType: LogRecordType;
  level: "info" | "warn" | "error";
  timestamp: DateTime;
  createdAt: DateTime;
  expireAt: DateTime; // Firestore TTL field
  timezone: string; // IANA — "UTC" for server-side events
  env: "development" | "production";
  sessionId: string;
  correlationId: string;
}

// ── APIIN ─────────────────────────────────────────────────────────────────────

export interface ApiIncomingData {
  method: string;
  url: string;
  route: string;
  status: number;
  durationMs: number;
  userId?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
}

// ── APIOUT ────────────────────────────────────────────────────────────────────

export interface ApiOutgoingData {
  method: string;
  url: string;
  status?: number | undefined;
  durationMs: number;
  context: string;
  error?: string | undefined;
}

// ── PAGEVIEW ──────────────────────────────────────────────────────────────────

export interface PageViewData {
  page: string;
  url: string;
  userId: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
  referer?: string | undefined;
}

// ── BLOGVIEW ──────────────────────────────────────────────────────────────────

export interface BlogViewData {
  ip: string;
  userAgent: string;
  browser: { name: string; version: string };
  os: { name: string; version: string };
  device: { type: "desktop" | "mobile" | "tablet" | "bot" };
  referer: string;
  refererSource: "direct" | "search" | "social" | "internal" | "unknown";
  language: string;
  isBot: boolean;
  userId?: string | undefined;
  country?: string | undefined;
}

// ── ARTVIEW ───────────────────────────────────────────────────────────────────

export interface ArtViewData extends BlogViewData {
  articleSlug: string;
  articleTitle: string;
}

// ── AUTHEVENT ─────────────────────────────────────────────────────────────────

export type AuthEventName =
  | "login_success"
  | "login_failed"
  | "logout"
  | "account_linked"
  | "account_link_skipped"
  | "token_exchange_success"
  | "token_exchange_failed";

export interface AuthEventData {
  event: AuthEventName;
  provider?: string | undefined;
  userId?: string | undefined;
  email?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  error?: string | undefined;
}

// ── SFOP ─────────────────────────────────────────────────────────────────────

export type SfOpName =
  | "token_acquire"
  | "token_refresh"
  | "token_cached"
  | "soql_query";

export interface SfOpData {
  operation: SfOpName;
  flowType: "jwt_bearer" | "token_exchange";
  clientId: string;
  sfUsername: string;
  fromCache?: boolean | undefined;
  query?: string | undefined;
  rowCount?: number | undefined;
  durationMs: number;
  userId: string;
  error?: string | undefined;
}

// ── APPERROR ──────────────────────────────────────────────────────────────────

export interface AppErrorData {
  message: string;
  stack?: string | undefined;
  route?: string | undefined;
  method?: string | undefined;
  userId?: string | undefined;
}

// ── Discriminated union ───────────────────────────────────────────────────────

export type LogRecord =
  | (BaseLogRecord & { logType: LogRecordType.APIIN; data: ApiIncomingData })
  | (BaseLogRecord & { logType: LogRecordType.APIOUT; data: ApiOutgoingData })
  | (BaseLogRecord & { logType: LogRecordType.PAGEVIEW; data: PageViewData })
  | (BaseLogRecord & { logType: LogRecordType.BLOGVIEW; data: BlogViewData })
  | (BaseLogRecord & { logType: LogRecordType.ARTVIEW; data: ArtViewData })
  | (BaseLogRecord & { logType: LogRecordType.AUTHEVENT; data: AuthEventData })
  | (BaseLogRecord & { logType: LogRecordType.SFOP; data: SfOpData })
  | (BaseLogRecord & { logType: LogRecordType.APPERROR; data: AppErrorData });
