# Feature Requirements Document — Logging Framework

**Status:** Ready for implementation
**Author:** Suman Gummalla
**Date:** 2026-05-02

---

## 1. Overview

This document defines the requirements for a structured, injectable logging framework for sgummalla.net. The framework must capture every significant event across the application — API traffic, page views, blog reads, authentication flows, Salesforce operations, and errors — store them in Firestore with appropriate retention, and present them through a future admin logs analyzer page.

**Storage decision:** Firestore (Google Firebase) was chosen over MongoDB Atlas for the following reasons:

- **99.999% SLA** (multi-region) — MongoDB Atlas M0 free tier has no SLA and can be taken down without notice
- **No inactivity pause** — Firestore is always available; Atlas M0 shares infrastructure with no uptime guarantee
- **Native TTL policies** — Firestore supports field-level TTL (released 2023), no Cloud Function required
- **Generous free tier** — 1 GB storage, 50K reads/day, 20K writes/day vs Atlas M0's 512 MB with no operation guarantees

The logging system must be observable in real time (via the debug toggle) and persistent for historical analysis.

---

## 2. Goals

- Capture all meaningful events across the full request lifecycle
- Provide session-level traceability — reconstruct everything that happened in a single user session
- Provide request-level correlation — link an incoming API call to every outgoing call it triggered
- Store all logs in Firestore; write to console only when debug mode is active
- Be fully injectable — any sink (MongoDB, console, future sinks) must be swappable without changing call sites
- Never block a request — all log writes are fire-and-forget
- Never log sensitive data — no raw passwords, tokens, private keys, or client secrets

---

## 3. Non-Goals (out of scope for this phase)

- Logs analyzer UI (separate feature, separate FRD)
- Log streaming or websocket-based live tail in the browser
- Rate limiting or sampling (log everything for now)
- Alerting or notifications on error thresholds

---

## 4. Log Record Types

All log entries are classified by a `LogRecordType` enum. Enum keys are uppercase (TypeScript convention); string values are lowercase.

```ts
enum LogRecordType {
  APIIN = "apiin", // incoming HTTP request to Express
  APIOUT = "apiout", // outgoing HTTP call to external API
  PAGEVIEW = "pageview", // authenticated app page visit
  BLOGVIEW = "blogview", // blog listing page — full visitor analytics
  ARTVIEW = "artview", // individual article read
  AUTHEVENT = "authevent", // login, logout, account link, token exchange
  SFOP = "sfop", // Salesforce token and SOQL operations
  APPERROR = "apperror", // unhandled server-side error
}
```

New log record types may be added as new features are introduced. Follow the process in `docs/FEATURE_DESIGN_GUIDELINES.md` section 4.2.

---

## 5. DateTime Convention

- All datetime fields use the TypeScript type alias `DateTime = Date`
- All values are stored in **UTC / GMT** — local time must never be stored
- The client timezone is captured separately in the `timezone` field (IANA format e.g. `America/New_York`)
- The `timestamp` field records when the event occurred; `createdAt` is the TTL index target and is always equal to `timestamp` at insert time

---

## 6. Data Models

### 6.1 Base Model

Every log record — regardless of type — contains these fields:

```ts
interface BaseLogRecord {
  logType: LogRecordType; // discriminator
  level: "info" | "warn" | "error";
  timestamp: DateTime; // event time — UTC
  createdAt: DateTime; // TTL index — UTC, same as timestamp
  timezone: string; // IANA timezone of the requester; "UTC" for server-side events
  env: "development" | "production";
  sessionId: string; // identifies all activity in one user session
  correlationId: string; // UUID per incoming request — links APIIN to its APIOUT children
}
```

### 6.2 `APIIN` — Incoming API Request

```ts
interface ApiIncomingData {
  method: string; // GET, POST, PATCH, DELETE
  url: string; // exact path e.g. /api/auth0/connections
  route: string; // Express route pattern e.g. /api/auth0/:action
  status: number; // HTTP response status code
  durationMs: number; // total request round-trip time
  userId?: string; // Auth0 user ID from JWT cookie if authenticated
  ip?: string; // client IP
  userAgent?: string; // raw user agent string
}
```

### 6.3 `APIOUT` — Outgoing HTTP Call

```ts
interface ApiOutgoingData {
  method: string; // HTTP method used
  url: string; // full external URL called
  status?: number; // response status code
  durationMs: number; // time from request to response
  context: string; // human label e.g. "Auth0 Management API — link identities"
  error?: string; // error message if call failed
}
```

`correlationId` links this record to the `APIIN` that triggered it via `AsyncLocalStorage`.

### 6.4 `PAGEVIEW` — Authenticated Page Visit

```ts
interface PageViewData {
  page: string; // route name e.g. "auths", "profile", "salesforce", "configuration"
  url: string; // full path e.g. /salesforce-exchange
  userId: string; // always present — all pages require authentication
  ip?: string;
  userAgent?: string;
  referer?: string; // previous page
}
```

### 6.5 `BLOGVIEW` — Blog Listing Page

```ts
interface BlogViewData {
  ip: string;
  userAgent: string;
  browser: { name: string; version: string };
  os: { name: string; version: string };
  device: { type: "desktop" | "mobile" | "tablet" | "bot" };
  referer: string;
  refererSource: "direct" | "search" | "social" | "internal" | "unknown";
  language: string; // from Accept-Language header e.g. "en-US"
  isBot: boolean; // true if user agent matches known bot patterns
  userId?: string; // present if visitor is logged in
  country?: string; // ISO 3166-1 alpha-2 from geoip-lite e.g. "US"
}
```

### 6.6 `ARTVIEW` — Article Read

Extends `BlogViewData` with article identity:

```ts
interface ArtViewData extends BlogViewData {
  articleSlug: string; // URL slug e.g. "salesforce-token-auth"
  articleTitle: string; // denormalized title for display in analyzer
}
```

### 6.7 `AUTHEVENT` — Authentication Flow Event

```ts
interface AuthEventData {
  event:
    | "login_success"
    | "login_failed"
    | "logout"
    | "account_linked"
    | "account_link_skipped"
    | "token_exchange_success"
    | "token_exchange_failed";
  provider?: string; // identity provider e.g. "google-oauth2", "auth0", "github"
  userId?: string; // Auth0 user ID — present on success, may be absent on failure
  email?: string; // attempted email — present on login events
  ip?: string;
  userAgent?: string;
  error?: string; // error message on failed events only
}
```

### 6.8 `SFOP` — Salesforce Operation

```ts
interface SfOpData {
  operation: "token_acquire" | "token_refresh" | "token_cached" | "soql_query";
  flowType: "jwt_bearer" | "token_exchange";
  clientId: string; // sf_clients.id (internal DB ID)
  sfUsername: string; // Salesforce username the operation was for
  fromCache?: boolean; // true if token was served from cache
  query?: string; // SOQL string — soql_query only
  rowCount?: number; // number of rows returned — soql_query only
  durationMs: number;
  userId: string; // who triggered the operation
  error?: string;
}
```

### 6.9 `APPERROR` — Unhandled Server Error

```ts
interface AppErrorData {
  message: string;
  stack?: string; // stack trace
  route?: string; // Express route where the error was thrown
  method?: string;
  userId?: string;
}
```

### 6.10 Discriminated Union

```ts
type LogRecord =
  | (BaseLogRecord & { logType: LogRecordType.APIIN; data: ApiIncomingData })
  | (BaseLogRecord & { logType: LogRecordType.APIOUT; data: ApiOutgoingData })
  | (BaseLogRecord & { logType: LogRecordType.PAGEVIEW; data: PageViewData })
  | (BaseLogRecord & { logType: LogRecordType.BLOGVIEW; data: BlogViewData })
  | (BaseLogRecord & { logType: LogRecordType.ARTVIEW; data: ArtViewData })
  | (BaseLogRecord & { logType: LogRecordType.AUTHEVENT; data: AuthEventData })
  | (BaseLogRecord & { logType: LogRecordType.SFOP; data: SfOpData })
  | (BaseLogRecord & { logType: LogRecordType.APPERROR; data: AppErrorData });
```

---

## 7. Session and Correlation Tracking

### 7.1 `sessionId`

Identifies all log records produced during a single user session. Present on every record.

| Request type                   | Derivation                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| Authenticated                  | SHA-256 hash of the JWT cookie value — rotates on each new login |
| Unauthenticated (blog visitor) | SHA-256 hash of `ip + userAgent + calendar-date (UTC)`           |

Using a hash means no raw PII is stored in the session identifier. The same visitor on the same day gets the same `sessionId` for blog views even across page loads.

### 7.2 `correlationId`

A UUID (v4) generated once per incoming HTTP request. Stored in Node.js `AsyncLocalStorage` for the duration of the request lifecycle. Every `loggedFetch()` call that runs within that request context automatically inherits the `correlationId` — no changes needed at call sites.

**Trace example:**

```
correlationId: "a3f9c2d1-..."

APIIN   → GET /api/auth0/callback          a3f9c2d1
APIOUT  → GET /api/v2/users-by-email       a3f9c2d1  (triggered by callback)
APIOUT  → POST /api/v2/users/.../identities a3f9c2d1  (triggered by callback)
APIOUT  → GET /api/v2/users/...            a3f9c2d1  (triggered by callback)
AUTHEVENT → account_linked                  a3f9c2d1
```

---

## 8. Injectable Framework Architecture

The logger must be fully injectable. No call site should depend on a specific sink implementation.

### 8.1 `LogSink` Interface

```ts
interface LogSink {
  name: string;
  write(record: LogRecord): Promise<void> | void;
}
```

### 8.2 Built-in Sinks

| Sink      | Class           | Behaviour                                                                  |
| --------- | --------------- | -------------------------------------------------------------------------- |
| Console   | `ConsoleSink`   | Writes a formatted single-line string. Active only when debug mode is ON.  |
| Firestore | `FirestoreSink` | Writes the full record to the correct Firestore collection. Always active. |

### 8.3 Logger Class

```ts
class Logger {
  register(sink: LogSink): void; // add or replace sink by name
  unregister(name: string): void; // remove a sink at runtime
  log(record: LogRecord): void; // fire-and-forget — writes to all registered sinks
}

export const logger = new Logger();
```

`log()` never throws. Each sink write is wrapped in its own try/catch — a failing sink is logged to stderr and does not affect other sinks or the request.

### 8.4 Startup Registration

```ts
// server/src/index.ts
logger.register(new ConsoleSink());
logger.register(new FirestoreSink());
```

To swap Firestore for a different store: implement `LogSink`, call `logger.unregister("firestore")`, call `logger.register(new NewSink())`. Zero changes at call sites.

---

## 9. Firestore Collections and TTL

| Collection    | Log types stored                  | TTL     |
| ------------- | --------------------------------- | ------- |
| `api_logs`    | `APIIN`, `APIOUT`, `APPERROR`     | 30 days |
| `page_views`  | `PAGEVIEW`, `BLOGVIEW`, `ARTVIEW` | 1 year  |
| `auth_events` | `AUTHEVENT`                       | 90 days |
| `sf_ops`      | `SFOP`                            | 90 days |

### TTL — Firestore native TTL policy

Each document includes an `expireAt` field (Firestore `Timestamp`) set at write time:

```ts
expireAt = Timestamp.fromDate(new Date(Date.now() + ttlMs));
```

TTL policies are configured once in the Firebase Console (or via `gcloud`):

```sh
# Example for api_logs collection group
gcloud firestore fields ttls update expireAt \
  --collection-group=api_logs \
  --project=<firebase-project-id>
```

Firestore deletes expired documents automatically within 72 hours of expiry. No Cloud Function or scheduled job required.

### Composite indexes required

Firestore requires explicit composite indexes for multi-field queries. Configure in Firebase Console → Firestore → Indexes:

| Collection    | Fields indexed                                                                           |
| ------------- | ---------------------------------------------------------------------------------------- |
| `api_logs`    | `sessionId` + `timestamp`, `data.userId` + `timestamp`, `correlationId`                  |
| `page_views`  | `sessionId` + `timestamp`, `data.userId` + `timestamp`, `data.articleSlug` + `timestamp` |
| `auth_events` | `sessionId` + `timestamp`, `data.userId` + `timestamp`, `data.event` + `timestamp`       |
| `sf_ops`      | `sessionId` + `timestamp`, `data.userId` + `timestamp`, `data.operation` + `timestamp`   |

### SDK and authentication

- Package: `firebase-admin` (Node.js server SDK)
- Auth: Firebase service account JSON key (`FIREBASE_SERVICE_ACCOUNT` env var as JSON string, or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a file)
- Firestore instance: initialized once as a singleton in `server/src/lib/firebase.ts`

---

## 10. Timezone Capture

The client sends its IANA timezone in a custom HTTP header:

```
Intl-Timezone: America/New_York
```

This header is set once in the axios client interceptor (`client/src/api/client.ts`) using `Intl.DateTimeFormat().resolvedOptions().timeZone`.

The server reads this header and stores it in `timezone` on `BLOGVIEW` and `ARTVIEW` records. All other records use `"UTC"`.

---

## 11. Sensitive Data Policy

The following must never appear in any log record field:

- Raw passwords
- Full JWT tokens or session cookies
- RSA private keys
- Salesforce access tokens or refresh tokens
- Auth0 client secrets
- Full Auth0 id_tokens

If a token value must be referenced for tracing, log the first 8 characters followed by `...` e.g. `eyJhbGci...`.

---

## 12. Implementation Checklist

### Firebase / Firestore setup

- [ ] Create Firebase project (or use existing Google account)
- [ ] Enable Firestore in Native mode
- [ ] Create service account with Firestore write permissions → download JSON key
- [ ] Add `FIREBASE_SERVICE_ACCOUNT` (JSON string) to `.env.example` and Fly secrets
- [ ] Configure TTL policies on `expireAt` field for all four collections via `gcloud` or Firebase Console
- [ ] Create composite indexes for all collections in Firebase Console → Firestore → Indexes

### Server — logger infrastructure

- [ ] Define `LogRecordType` enum and all data model interfaces in `server/src/lib/logTypes.ts`
- [ ] Implement `LogSink` interface, `ConsoleSink`, `FirestoreSink` in `server/src/lib/sinks/`
- [ ] Implement `Logger` class with `register`, `unregister`, `log` in `server/src/lib/logger.ts`
- [ ] Set up Firebase Admin SDK singleton in `server/src/lib/firebase.ts`
- [ ] `FirestoreSink.write()` routes to correct collection by `logType`, adds `expireAt` timestamp

### Server — context propagation

- [ ] Implement `AsyncLocalStorage` context for `correlationId` and `sessionId` propagation
- [ ] Update `requestLogger` middleware to generate `correlationId`, derive `sessionId`, store both in `AsyncLocalStorage`, emit `APIIN`
- [ ] Update `loggedFetch()` to read `correlationId` and `sessionId` from `AsyncLocalStorage`, emit `APIOUT`

### Server — emission points

- [ ] Add `AUTHEVENT` emissions to all auth flow handlers (login, logout, callback, link)
- [ ] Add `SFOP` emissions to all Salesforce token and query handlers
- [ ] Add `BLOGVIEW` / `ARTVIEW` emissions to blog and article routes
- [ ] Add `PAGEVIEW` emissions from client `onMounted` hooks via a new `POST /api/logs/pageview` endpoint
- [ ] Add `APPERROR` emission to Express global error handler

### Client

- [ ] Add `Intl-Timezone` header to axios client interceptor

### Startup

- [ ] Register `ConsoleSink` and `FirestoreSink` at startup in `index.ts`
- [ ] Update `docs/FEATURE_DESIGN_GUIDELINES.md` with final `LogRecordType` table and Firestore reference
