# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering principles (binding — apply to all code in this repo)

These are non-negotiable and must be satisfied before any change is considered complete.

- **No hardcoding.** Hardcoded values are prohibited in application logic (components, routes, stores, strategies, utilities). This includes model names/IDs, provider names, endpoints/URLs/ports, file size limits and extensions, pricing/costs/token rates, timeouts/retries/pagination limits, config-driven UI copy, and feature flags expressed as string comparisons. If a value can change without a redeploy, source it from the database or environment config. Truly unavoidable literals (mathematical constants, library-required values) must live in a dedicated constants file, be named in `SCREAMING_SNAKE_CASE`, carry a comment explaining why they can't be externalised, and be referenced by name — never inlined.
- **SOLID principles, strictly enforced.** Single Responsibility (route handlers handle HTTP, repositories handle data, stores handle state, components handle rendering — never mixed), Open/Closed (extend via new providers/strategies/registries, don't grow `if/elif` chains), Liskov Substitution (implementations fully interchangeable behind their interface), Interface Segregation (narrow contracts; components/functions receive only what they use), Dependency Inversion (depend on abstractions, not concrete drivers/SDKs). Violations must be fixed before committing.
- **Clean Architecture.** Maintain clear layer boundaries with dependencies pointing inward: domain/entities → use cases/business logic → interface adapters (routes, controllers, presenters, repositories) → frameworks/drivers (Express, Vite, Postgres, HTTP clients). Inner layers must never import or depend on outer layers; cross boundaries through interfaces. Keep business logic out of route handlers and components.
- **Tests are mandatory.** Unit tests and integration tests are required for new and changed code, with good coverage of business logic, edge cases, and error paths. No feature is complete without them.

## Repository layout

This repo root contains three independent areas:

- `vue-app/` — the full-stack web application (a **pnpm workspace**). Almost all development happens here.
- `salesforce/` — an SFDX project (`force-app/`) deployed with the `sf` CLI; unrelated to the web app's build.
- `docs/` — project documentation, including binding engineering guidelines (see below).

**All pnpm commands must be run from `vue-app/`** — there is no root `package.json`.

## Commands (run from `vue-app/`)

```bash
pnpm install            # install all workspace deps
pnpm dev                # start the whole app (server + client together — see dev model below)
pnpm build              # build @sgw/ui then @sgw/client (production)
pnpm typecheck          # vue-tsc / tsc --noEmit across all packages (pnpm -r)
pnpm lint               # eslint across all packages
pnpm format             # prettier --write
pnpm check              # full CI gate: ui build + all typechecks + format:check + client vite build
```

Per-package work uses pnpm filters: `pnpm --filter @sgw/client <script>`, `@sgw/server`, `@sgw/ui`.

There is **no test runner configured** — `pnpm check` (typecheck + build + format) is the verification gate. Do not invent `pnpm test`.

The server has a one-off data migration script: `pnpm --filter @sgw/server migrate:logs`.

## The three workspace packages

- **`@sgw/ui`** (`packages/ui/`) — portable Vue 3 component + theme library, npm-publishable on its own. Themes are TypeScript objects implementing `SgwTheme`, injected at startup via `ThemeProvider` using CSS custom properties, swappable at runtime. Exposes components, layouts, and theme via `src/index.ts`.
- **`@sgw/client`** (`client/`) — Vue 3 + Vite frontend. Consumes `@sgw/ui`, uses Pinia (state), Vue Router 4, UnoCSS, and Axios (`credentials: include`) to call the server. In `vite.config.ts`, `@sgw/ui` is aliased to the library's **source** (`../packages/ui/src/index.ts`), and `@` to `client/src` — so editing UI source is reflected live without rebuilding the package.
- **`@sgw/server`** (`server/`) — Express + TypeScript API.

## Dev model — one server, no proxy (important)

`pnpm dev` runs **only the server** (`@sgw/server`). In development, `server/src/index.ts` boots Vite in **middleware mode** on the same HTTP server (sharing the port and HMR WebSocket) — there is **no separate client dev server and no proxy**. API routes are mounted under `/api/*`; everything else is handled by Vite middleware. In production (`NODE_ENV=production`) the server instead serves the static client build from `../../public` and SPA-falls back to `index.html`.

## Backend architecture

- **Auth** is stateless: every flow (credential login, Auth0, SAML 2.0, OIDC) terminates by signing a JWT and setting the **same httpOnly cookie**, so the frontend session is identical regardless of method. Federated callbacks live at `/api/<method>/callback` (e.g. `/api/saml/callback`, `/api/oidc/callback`, `/api/auth0/callback`).
- **Routes** (`server/src/routes/`): one route file per concern, mounted in `index.ts`. Handlers contain no business logic — that lives in `server/src/lib/`.
- **Middleware** (`server/src/middleware/`): `requireAuth` (any user data), `requireOwner` (destructive/admin ops, layered on top of `requireAuth`), `validate` (request-body validation), `requestLogger`.
- **Database**: Postgres via the `postgres` package. Use the `sql` tagged template from `server/src/lib/db.ts` for **all** queries — no raw SQL strings. Schema lives in `server/src/lib/ensureTables.ts` as idempotent migrations guarded by `columnExists()` / `tableExists()`, run at startup. User-owned tables carry `user_id TEXT NOT NULL`.
- **Logging is mandatory infrastructure**, not optional. Every feature emits structured logs typed by the `LogRecordType` enum (`server/src/lib/logTypes.ts`). Logs go through pluggable **sinks** (`server/src/lib/sinks/`): dev registers `ConsoleSink` + `FileSink` (→ `server/logs/`); prod registers `FirestoreSink` (30-day TTL) when `FIREBASE_SERVICE_ACCOUNT` is set.

## Frontend conventions

- **Views are co-located folders, LWC-style**: `client/src/views/<Name>View/<Name>View.vue` + `<Name>View.css` (one folder per view, component and its styles together).
- Client API calls are organized one module per backend domain under `client/src/api/` (`auth.ts`, `salesforce.ts`, …), built on a shared `client.ts` Axios instance.
- ESLint enforces: Vue **`<script setup>` only** (`vue/component-api-style`), **type-based `defineProps`**, `consistent-type-imports`, and `no-explicit-any` as an **error**. TypeScript strict mode is on across the repo.

## Required reading before building a feature

`vue-app/docs/FEATURE_DESIGN_GUIDELINES.md` is binding. Key rules beyond the above: build against **real systems, not mocks** (this is a live demo platform); the **server owns all secrets** — the client only ever sees opaque IDs and display data; all user data is **scoped by `user_id`** at DB and API layers. `vue-app/docs/FRD-LOGGING-FRAMEWORK.md` details the logging framework.

## Deployment

The app deploys to **Fly.io** (`fly.toml`, `fly.staging.toml`) via the `Dockerfile`, on port 3000 in production. Blog content is subject to the publishing policy in `README.md` (GA features only, no confidential/pre-release info) and every article auto-appends a disclaimer.
