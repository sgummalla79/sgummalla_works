# Sgummalla Works

A modern, full-stack built with Vue 3, TypeScript, Express, and a portable shared UI component library.

---

## Stack

| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| Frontend        | Vue 3 + TypeScript + Vite                       |
| Styling         | UnoCSS + CSS custom properties                  |
| State           | Pinia                                           |
| Routing         | Vue Router 4                                    |
| UI Library      | `@sgw/ui` (internal, npm-portable)              |
| Backend         | Express + TypeScript                            |
| Auth            | httpOnly cookie · JWT · Auth0 · SAML 2.0 · OIDC |
| Package Manager | pnpm workspaces                                 |

---

## Monorepo Structure

```
sgummalla-works/
├── vue-app/                    → full web application
│   ├── packages/
│   │   └── ui/          → @sgw/ui  — shared component + theme library
│   ├── client/          → @sgw/client — Vue frontend
│   ├── server/          → @sgw/server — Express API
│   ├── pnpm-workspace.yaml
│   └── package.json
├── salesforce/                 → Salesforce metadata & scripts
└── docs/                       → project documentation
```

---

## Getting Started

```bash
# Install all dependencies
cd vue-app && pnpm install

# Run frontend + backend in parallel
pnpm dev

# Build everything
pnpm build
```

---

## Packages

### `@sgw/ui`

Shared UI component library. Fully portable — can be published to npm independently.
Theme injection via `ThemeProvider.vue` using CSS custom properties.
See [`vue-app/packages/ui/README.md`](./vue-app/packages/ui/README.md).

### `@sgw/client`

Vue 3 frontend application. Consumes `@sgw/ui` for all UI components.
Communicates with `@sgw/server` via Axios with `credentials: include`.
See [`vue-app/client/README.md`](./vue-app/client/README.md).

### `@sgw/server`

Express API server. Stateless JWT auth via httpOnly cookies.
Handles credentials, Auth0, SAML 2.0, and OIDC.
See [`vue-app/server/README.md`](./vue-app/server/README.md).

---

## Auth Flows

### Credential login

```
POST /api/auth/login → verify → sign JWT → set httpOnly cookie → 200
GET  /api/auth/me    → verify cookie → return user
POST /api/auth/logout → clear cookie → 200
```

### Auth0 / OIDC / SAML

```
All federated flows terminate at their respective /api/*/callback route
Each callback signs a JWT and sets the same httpOnly cookie
Frontend receives the same session regardless of auth method
```

---

## SAML / OIDC Client Configuration

If you are an identity provider or service provider integrated with Sgummalla Works,
the following URLs changed in the Vue migration:

| Setting           | Old         | New                   |
| ----------------- | ----------- | --------------------- |
| SAML ACS URL      | `/callback` | `/api/saml/callback`  |
| SAML SLO URL      | `/logout`   | `/api/saml/logout`    |
| OIDC Redirect URI | `/callback` | `/api/oidc/callback`  |
| Auth0 Callback    | `/callback` | `/api/auth0/callback` |
| Auth0 Logout      | `/logout`   | `/api/auth/logout`    |

---

## Theme System

Themes are TypeScript objects implementing `SgwTheme` from `@sgw/ui`.
Injected at app startup via `ThemeProvider`. Swappable at runtime.

```typescript
import { ThemeProvider, defaultTheme } from "@sgw/ui";

// Use default
app.use(ThemeProvider, { theme: defaultTheme });

// Swap theme
import { darkProTheme } from "@sgw/ui";
app.use(ThemeProvider, { theme: darkProTheme });
```

---

## Development Modules

Each module is an independent, committable unit with no dangling dependencies.
Complete each module fully before starting the next.

| #   | Module                    | Package       | Status      | Branch                           |
| --- | ------------------------- | ------------- | ----------- | -------------------------------- |
| 1   | Monorepo Scaffold         | root          | ✅ Complete | `feat/module-1-scaffold`         |
| 2   | UI — Theme System         | `@sgw/ui`     | ✅ Complete | `feat/module-2-ui-theme`         |
| 3   | UI — Primitive Components | `@sgw/ui`     | ✅ Complete | `feat/module-3-ui-primitives`    |
| 4   | UI — Layout Components    | `@sgw/ui`     | ✅ Complete | `feat/module-4-ui-layouts`       |
| 5   | Server — Core             | `@sgw/server` | ✅ Complete | `feat/module-5-server-core`      |
| 6   | Server — Credential Auth  | `@sgw/server` | ✅ Complete | `feat/module-6-server-auth`      |
| 7   | Server — Federated Auth   | `@sgw/server` | ✅ Complete | `feat/module-7-server-federated` |
| 8   | Client — Scaffold         | `@sgw/client` | ✅ Complete | `feat/module-8-client-scaffold`  |
| 9   | Client — Auth Layer       | `@sgw/client` | ✅ Complete | `feat/module-9-client-auth`      |
| 10  | Client — Views            | `@sgw/client` | ✅ Complete | `feat/module-10-client-views`    |

### Status key

| Icon | Meaning              |
| ---- | -------------------- |
| ⬜   | Not started          |
| 🔄   | In progress          |
| ✅   | Complete — committed |
| ❌   | Blocked              |

---

## Recommended Per-Module Workflow

```bash
# 1. Create branch
git checkout -b feat/module-N-name

# 2. Work through the module in its dedicated chat
#    Upload key config files to project knowledge when done

# 3. Verify the module independently
pnpm --filter @sgummalla-works/[package] build   # must succeed
pnpm --filter @sgummalla-works/[package] test    # must pass

# 4. Commit
git add .
git commit -m "feat(module-N): description"
git push origin feat/module-N-name
```

---

## Project Knowledge — Chat Handoff Files

When completing a module and moving to a new chat, upload these files
to project knowledge so the next chat has full context:

| After module | Upload these files                                                       |
| ------------ | ------------------------------------------------------------------------ |
| 1            | `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`         |
| 2            | `packages/ui/package.json`, `tokens.ts`, `default.ts`, `uno.config.ts`   |
| 3            | All component `.vue` files from `packages/ui/src/components/`            |
| 4            | `AppLayout.vue`, `LoginLayout.vue`, `packages/ui/src/index.ts`           |
| 5            | `server/package.json`, `server/src/index.ts`, `jwt.ts`, `requireAuth.ts` |
| 6            | `routes/auth.ts`                                                         |
| 7            | All `routes/*.ts` files                                                  |
| 8            | `vue-app/client/package.json`, `vite.config.ts`, `App.vue`, `router/index.ts` |
| 9            | `stores/auth.ts`, `api/client.ts`, `api/auth.ts`                              |
| 10           | All `views/*.vue` files                                                  |

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=1h
CLIENT_URL=http://localhost:5173

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_CALLBACK_URL=http://localhost:3000/api/auth0/callback

# SAML
SAML_CALLBACK_URL=http://localhost:3000/api/saml/callback
SAML_ENTRY_POINT=
SAML_ISSUER=
SAML_CERT=

# OIDC
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_ISSUER=
```

### Client (`vue-app/client/.env`)

```env
VITE_API_URL=http://localhost:3000
```

> Production: change `VITE_API_URL` to your deployed server URL.
> Moving server to its own repo: only this one variable changes.

---

## Blog Content Policy

Articles published on this site must comply with the following guidelines:

- **GA features only** — content must cover Generally Available (GA) features. Do not disclose pre-release, beta, or roadmap information.
- **No confidential information** — never publish proprietary, internal, or non-public company information.
- **Align with official documentation** — content must be consistent with public-facing product documentation and official communication policies.
- **Share responsibly** — when sharing article URLs in internal or external channels, follow your organisation's Share Article URLs in Channels guidelines.

---

## Blog Content Policy

Articles published on this site must comply with the following guidelines:

- **GA features only** — content must cover Generally Available (GA) features. Do not disclose pre-release, beta, or roadmap information.
- **No confidential information** — never publish proprietary, internal, or non-public company information.
- **Align with official documentation** — content must be consistent with public-facing product documentation and official communication policies.
- **Share responsibly** — when sharing article URLs in internal or external channels, follow your organisation's Share Article URLs in Channels guidelines.

All articles automatically display the following disclaimer at the bottom:

> **Disclaimer:** The information in this article is based on generally available (GA) features and publicly accessible documentation at the time of publication. It does not represent official guidance from any employer or organisation and does not disclose any confidential, pre-release, or proprietary information. Product features, behaviour, and documentation may change over time. Please refer to the latest official documentation and verify all information before making any technical or business decisions.

---

_Last updated: Module 10 — Client Views complete. All modules done. 🎉_
