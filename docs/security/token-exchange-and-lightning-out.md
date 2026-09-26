# Security review: Token Exchange and Lightning Out 2.0

Scope: the Salesforce Token Exchange flow and the Lightning Out 2.0 embed, on both
the web app (`vue-app/`) and the Salesforce side (`force-app/`).
Review date: 2026-09-25. Branch: `feature/salesforce-iframe`.

The flow under review: the user logs in through Auth0, the server stores the Auth0
`id_token`, and it sends that token to Salesforce as the `subject_token`. The Apex
handler `WebAppTokenExchangeHandler` validates it and maps it to a Salesforce user.
Salesforce returns an access token, which the server uses for API calls, frontdoor
sign-in and Lightning Out.

## Status at a glance

| # | Item | Side | Severity | Status |
|---|------|------|----------|--------|
| 1 | Auth0 JWT signature not verified (sequence diagram step 7) | Salesforce | High | Fixed, on staging |
| 2 | Client lookups not scoped by `user_id` (cross-user token access) | App | High | Fixed, on staging |
| 3 | `login_url` / `instance_url` not validated (SSRF, script injection) | App | High | Fixed, on staging |
| 4 | Salesforce tokens and `sid=` URL sent to the browser | App | Medium | Fixed, on staging |
| 5 | Secrets stored in plaintext in Postgres | App | Medium | Coded, not deployed |
| 6 | Auth0 `id_token` returned to the browser (`GET /api/auth/id-token`) | App | Medium | Decision pending |
| 7 | Salesforce session survives logout | App | Medium | Open |
| 8 | Rate limiting, generic error text | App | Low | Open |
| S1 | Whole System Administrator profile pre-authorized | Salesforce | High | Open |
| S2 | Handler runs as a personal admin user | Salesforce | High | Open |
| S3 | Refresh tokens allowed but unused | Salesforce | Medium | Open |
| S4 | IP restrictions bypassed | Salesforce | Medium | Accepted trade-off |
| S5 | Token exchange does not require a client secret | Salesforce | Medium | Accepted |
| S6 | Trust in the `sf_accounts` claim | Auth0 | Medium | Verify |
| S7 | CORS and Trusted URL allowlists for Lightning Out | Salesforce | Medium | Verify |
| S8 | Session runs with the user's own permissions | Salesforce | Low | Open (follows S1) |
| S9 | Unused `WebAppExtClntAppHandler` plugin class | Salesforce | Low | Open |
| S10 | `WebAppTokenExchangeHandler` has no sharing keyword | Salesforce | Low | Open |

"On staging" means deployed and tested on `sgummalla-net-staging`. Nothing here has
been deployed to production.

## Done

### 1. Signature verification in the Apex handler
`WebAppTokenExchangeHandler` originally decoded the JWT payload and trusted it.
Anyone could forge a token naming any `sf_username`. It now:

- verifies the signature against the Auth0 JWKS endpoint
  (`Auth.JWTUtil.validateJWTWithKeysEndpoint`), so key rotation needs no change
- rejects expired tokens (Salesforce returns `exp` as a UTC date-time string, not
  epoch seconds)
- requires the issuer to equal exactly `https://<tenant>/`
- requires the audience to equal the Auth0 web app client id (Salesforce returns
  `aud` as a bracketed list like `[id]`)
- parses the `sf_accounts` claim, which arrives as a string

The tenant domain and client id are named constants at the top of the class, because
Apex cannot read env config. A Remote Site Setting for the tenant is required.

### 2. Ownership scoping
Every route that takes a client id now goes through `sfClientRepository`
(`findOwnedExchangeClient`, `findOwnedJwtBearerClient`), which filters on `user_id`.
A missing client and someone else's client return the same 404. This covers the
token exchange routes and the JWT bearer routes (which also load the private key).

### 3. Salesforce host allowlist
`sfHostAllowlist.ts` allows only https URLs on `*.salesforce.com` and `*.force.com`,
with no credentials or custom port. Override with `SF_ALLOWED_HOST_SUFFIXES`. It is
applied to `login_url` (create and update), the token endpoint, `instance_url`, the
frontdoor URL and the Lightning Out script URL. The client repeats the check before
loading a script or setting the frontdoor URL.

### 4. Tokens kept off the browser
Token endpoints return only `sf_username`, `instance_url`, `issued_at`,
`has_refresh_token` and `from_cache` (`sfTokenPresenter.ts`). `/frontdoor` now trades
the token for a single-use URL at `services/oauth2/singleaccess` (`sfFrontdoor.ts`),
instead of putting `sid=<access_token>` in a URL.

## Coded, not yet deployed

### 5. Encryption at rest
The `id_token` (`user_id_tokens`), the Salesforce access and refresh tokens
(`sf_tokens`) and client private keys (`sf_clients`) are encrypted with AES-256-GCM.
Values are stored with an `enc:v1:` prefix. Old plaintext rows still work and are
re-encrypted on the next write, or all at once by the backfill script.

Deploy order matters. If the key is missing, writes fail, including storing the
`id_token` at login.

1. Generate a key: `openssl rand -hex 32`.
2. Set it as a Fly secret, staging first:
   `fly secrets set TOKEN_ENCRYPTION_KEY=<value> -a sgummalla-net-staging`.
3. Deploy the code.
4. Run the backfill: `pnpm encrypt:secrets` (in `vue-app/server`). Check the script
   path if running it inside the container.
5. Keep a copy of the key somewhere safe. If it is lost, stored secrets cannot be
   read and users must log in again. Use the same key for any environments that
   share a database.

## Open: app side

### 6. `GET /api/auth/id-token` returns the raw Auth0 `id_token`
This is the credential Token Exchange trades for a Salesforce session, and the
profile page displays it. Any XSS could fetch it and replay it while it is valid.
Options:

1. Return only the decoded claims (header and payload), never the signed token.
   Recommended. Keeps the profile feature.
2. Remove the endpoint and the display.
3. Keep it as is. Not recommended.

### 7. Salesforce session survives logout
Logging out of the site does not end the Salesforce or Lightning Out session, and the
Salesforce session cookie stays in the browser. Revoke the Salesforce token when the
user logs out.

### 8. Low-severity app items
- No rate limiting on `/frontdoor` and `/lightning-out`. Each call mints a fresh
  Salesforce token.
- Salesforce error text is returned to the client as is. Return a generic message and
  keep the detail in the logs.
- `/query` accepts arbitrary SOQL. The impact is bounded by the Salesforce user's own
  permissions, so this is an accepted risk.

## Open: Salesforce side

Metadata is in `force-app/main/default`. A manifest for retrieving it is in
`manifest/package.xml`.

### S1. The whole System Administrator profile is pre-authorized
`extlClntAppOauthPolicies/sgummallaworks_token_exchange_oauthPlcy` uses
`commaSeparatedProfile = System Administrator` with `AdminApprovedPreAuthorized`. The
handler maps the token's `sf_username` straight to a Salesforce user. If an Auth0
account carries an admin username in `sf_accounts`, the exchange gives a full admin
session through Lightning Out and frontdoor.
Fix: pre-authorize a dedicated permission set and assign it only to the users who
should sign in this way.

### S2. The handler runs as a personal admin user
`executeHandlerAs` and the handler enablement both use `sgummalla@exp-cloud.org`. The
`getUserForTokenSubject` query therefore runs with admin rights.
Fix: a dedicated integration user with only the access the handler needs. Needs the
integration user's username.

### S3. Refresh tokens are allowed but unused
The policy has `refreshTokenPolicyType = Infinite` and the `RefreshToken` scope, and
the handler registry has `isRefreshTokenSupported = true`. The app never uses refresh
tokens for this flow.
Fix: turn off refresh support, remove the `RefreshToken` scope and set the refresh
policy to expire immediately.

### S4. IP restrictions are bypassed
`ipRelaxationPolicyType = Bypass`, so the signature check is the only gate. Enforcing
IPs would break the flow unless Fly provides a static egress IP. Leave as is unless a
fixed IP is available.

### S5. No client secret required for token exchange
`isSecretRequiredForTokenExchange = false`. The exchange needs the client id and a
valid Auth0 token. This is acceptable now that the signature and audience are
verified. The server does not send a secret, so switching it to `true` would break
the flow unless the server is changed too.

### S6. Trust in the `sf_accounts` claim
The handler trusts `sf_accounts` completely. It must come from Auth0 `app_metadata`,
which users cannot edit, and never from `user_metadata`. Confirm in the Auth0 Action.

### S7. CORS and Trusted URL allowlists
Lightning Out needs the site origin in the CORS allowlist. The org's CORS list already
contains `http://localhost:5173`, a plain-http development entry. Remove it if not
needed. Make sure the production and staging entries are exact origins and not
wildcards.

### S8. The session runs with the user's own permissions
Lightning Out limits what the embedded session can reach to Lightning Out apps, but
the session is still the signed-in user's, so an admin user gets an admin session.
This goes away once S1 is fixed.

### S9. Unused plugin class
The policy's Apex plugin class is `WebAppExtClntAppHandler`. It validates against
`sgummalla_net_cert`, which cannot verify Auth0 tokens, and it looks users up by
email. It is not part of the working flow.
Fix: clear the field on the policy and delete the class.

### S10. No sharing keyword
`WebAppTokenExchangeHandler` is declared `public class` with no sharing keyword. Add
`with sharing` or `inherited sharing`.

## Operational notes

- The token handler record is `WebAppExtClntAppHandler` (the record name). Its Apex
  class is `WebAppTokenExchangeHandler`, and the ECA is enabled on it with
  `isDefault = true`. The ECA policy field "Apex Plugin Class" is a different thing.
- Deploying only the Apex class is safe. Do not deploy the whole `force-app` folder
  over the org without retrieving first, because the repo copies can be stale.
- `sf project retrieve start` returns nothing when the output folder is excluded by
  `.forceignore` (for example anything under `.sf/`).
- Before a production deploy, confirm no `sf_clients` rows have a non-Salesforce
  `login_url`. Those clients now fail with an error.
- `TOKEN_ENCRYPTION_KEY` must be added to the Fly secrets before deploying item 5.

## Verification checklist for staging and production

1. Token Exchange login succeeds.
2. "Open Salesforce" (frontdoor) opens a logged-in session.
3. Lightning Out loads the component.
4. JWT Bearer page: get token, refresh and SOQL work, and the network responses contain
   no `access_token` or `refresh_token`.
5. Using another user's client id returns "Client not found".
6. A token with one edited character is rejected.
7. Creating a client with a non-Salesforce `login_url` is rejected.
