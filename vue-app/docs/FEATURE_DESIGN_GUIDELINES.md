# Feature Design Guidelines

Guidelines for designing and implementing features in this codebase. Every engineer (or AI agent) working on this project must follow these before shipping a feature.

---

## 1. General Principles

- **Build for the demo.** This is a live technical demonstration platform. Features must work end-to-end against real systems — not mocks, not stubs.
- **Server owns secrets.** No credentials, private keys, tokens, or sensitive claims reach the browser. The client only ever sees opaque IDs and display data.
- **Scope by user.** Any data that belongs to a user (clients, tokens, logs) must be scoped to `user_id` at the DB and API layer. No global shared state between users.
- **Owner vs authenticated.** Destructive or admin operations (`DELETE`, `PATCH` on system config, debug toggle) require the `requireOwner` middleware. Read and execute operations are open to all authenticated users.
- **TypeScript strict mode is on.** No `any`, no non-null assertion without a comment explaining why, no suppressing compiler errors.

---

## 2. API Design

- Every new route goes in its own file under `server/src/routes/`.
- All routes that touch user data use `requireAuth` middleware.
- Admin-only routes add `requireOwner` on top of `requireAuth`.
- Route handlers never contain business logic — extract to `server/src/lib/`.
- Response shape for errors: `{ error: string, message: string }` with an appropriate HTTP status code.
- Validate all request bodies using the `validate` middleware before touching them.

---

## 3. Database

- Schema migrations live in `server/src/lib/ensureTables.ts`. Use `columnExists()` / `tableExists()` guards so migrations are idempotent.
- Every table that stores user data must have a `user_id TEXT NOT NULL` column.
- New tables get a backfill migration for any existing rows that predate the `user_id` column, using `OWNER_USER_ID` from env.
- No raw SQL strings — use the `sql` tagged template from `server/src/lib/db.ts` for all queries.

---

## 4. Logging — Required for Every Feature

> **Every new feature must include detailed logging. This is not optional.**

Logging is how this platform observes itself in production. A feature without logging is a feature you cannot debug, audit, or analyze.

### 4.1 Log Record Types

All log entries use the `LogRecordType` enum. Current types:

| Enum value  | Covers                                                            |
| ----------- | ----------------------------------------------------------------- |
| `APIIN`     | Every incoming HTTP request to the Express server                 |
| `APIOUT`    | Every outgoing HTTP call (Auth0, Salesforce, any external API)    |
| `PAGEVIEW`  | Authenticated page visits (auths, profile, salesforce, config)    |
| `BLOGVIEW`  | Blog listing page — includes full visitor analytics               |
| `ARTVIEW`   | Individual article read — includes slug, title, visitor analytics |
| `AUTHEVENT` | Login, logout, login failed, account link, token exchange         |
| `SFOP`      | Salesforce operations — token acquire, token refresh, SOQL query  |
| `APPERROR`  | Unhandled server errors caught by the global error handler        |

### 4.2 Adding a New Log Record Type

When a new feature introduces a new category of event that does not fit any existing type:

1. Add the new value to the `LogRecordType` enum in `server/src/lib/logTypes.ts`.
2. Define its specific data interface (extending `BaseLogRecord`).
3. Add it to the `LogRecord` discriminated union.
4. Document it in this table above.
5. Assign a collection in `server/src/lib/firebase.ts` and configure a TTL policy for `expireAt` in Firebase Console.

**Naming rules for new types:** uppercase, no underscores, short but readable (4–10 characters). Examples: `APIIN`, `SFOP`, `AUTHEVENT`.

### 4.3 What must be logged in a new feature

| Event                       | Log type to use                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| New incoming API route      | `APIIN` — automatic via `requestLogger` middleware, but add route-level context if needed |
| New outgoing HTTP call      | `APIOUT` — use `loggedFetch()` with a descriptive context label, never raw `fetch()`      |
| New page/view in the client | `PAGEVIEW` or a new specific type if it carries unique analytics data                     |
| New auth flow or step       | `AUTHEVENT` with a new `event` value                                                      |
| New Salesforce operation    | `SFOP` with the operation name and outcome                                                |
| New error condition         | `APPERROR` if unhandled, or `level: "error"` on the relevant type                         |

### 4.4 Log entry quality

- **`context` field on outgoing calls** must be human-readable and specific: `"Auth0 Management API — link identities"` not `"auth0 call"`.
- **`AUTHEVENT` entries** must include `userId` when known — even on failure (use the attempted email or partial ID if available).
- **`SFOP` entries** must include the client ID, operation name, and whether the result was from cache or a fresh exchange.
- **`BLOGVIEW` / `ARTVIEW` entries** must include the full visitor analytics block (IP, UA, parsed browser/OS/device, referer, sessionId).
- Never log raw passwords, private keys, full tokens, or client secrets. Log the first 8 characters of a token followed by `...` if the token identity is needed for tracing.

### 4.5 Console vs MongoDB

- **Firestore** — always written, regardless of debug mode. This is the permanent record.
- **Console** — written only when debug mode is `ON` (toggled by owner in the avatar menu). Use this for local development and live troubleshooting.

The `log()` function handles both sinks automatically. Call sites never decide where to write.

### 4.6 Fire-and-forget

Log writes must never block a request. Always write to Firestore without `await` in the hot path. If the Firestore write fails, catch silently and fall back to console — logging failures must never surface as errors to the client.

```ts
// correct
void writeToMongo(entry);

// wrong — blocks the response
await writeToMongo(entry);
```

---

## 5. Frontend

- New views go in `client/src/views/`, new reusable pieces in `client/src/components/`.
- API calls go in `client/src/api/` — views never call `fetch()` directly.
- All authenticated views pass `:debug-mode="auth.debugMode"` and `@toggle-debug="auth.toggleDebugMode"` to `AppLayout` until the debug toggle is removed.
- Page visits that should be logged call the page-view logging endpoint on `onMounted`.
- Scrollable pages use `scrollable="true"` on `AppLayout`. Header and footer must always remain visible — only the content area between them scrolls.

---

## 6. Security Checklist Before Shipping

- [ ] No secrets in client-side code or API responses
- [ ] All user-data queries filtered by `user_id = req.user.id`
- [ ] Destructive operations have `requireOwner` or ownership verification
- [ ] Input validated with `validate()` middleware on all POST/PATCH bodies
- [ ] No `console.log` left in code — use `log()` from the logger instead
- [ ] New log entries reviewed against section 4.4 — no sensitive data logged raw

---

## 7. Environment Variables

- New secrets go in `server/.env.example` with a placeholder value and a comment.
- Secrets that are needed in production are set as Fly.io secrets (`fly secrets set KEY=value`).
- Never commit real values to `.env.example` or any tracked file.
- Access env vars through `process.env.VAR_NAME` with a clear error thrown at startup if a required var is missing.
