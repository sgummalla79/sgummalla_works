import { Router, type Request, type Response } from "express";
import { randomBytes, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifyToken,
  signToken,
  getCookieName,
  type AuthUser,
} from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router: import("express").Router = Router();

// ── Config ────────────────────────────────────────────────────────────────────

const IDP_ISSUER = process.env.IDP_ENTITY_ID ?? "https://sgummalla-net.fly.dev";

// Salesforce registers Sgummalla Works as an Auth Provider with these credentials
const SF_CLIENT_ID = process.env.SF_OIDC_CLIENT_ID ?? "salesforce-helpportal";
const SF_CLIENT_SECRET = process.env.SF_OIDC_CLIENT_SECRET ?? "";
const SF_REDIRECT_URI =
  process.env.SF_OIDC_REDIRECT_URI ??
  "https://help.sgummalla.net/services/authcallback/sgummalla_net_oauth_idp";

// In-memory auth code store (short-lived, 5 min TTL)
interface AuthCode {
  code: string;
  user: AuthUser;
  redirectUri: string;
  expiresAt: number;
}
const authCodes = new Map<string, AuthCode>();

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authCodes.entries()) {
    if (val.expiresAt < now) authCodes.delete(key);
  }
}, 60_000);

// ── Cert helpers (reuse IDP cert for signing id_token) ────────────────────────

function getCertAndKey(): { cert: string; key: string } {
  if (process.env.IDP_CERT && process.env.IDP_PRIVATE_KEY) {
    return { cert: process.env.IDP_CERT, key: process.env.IDP_PRIVATE_KEY };
  }
  const certsDir = resolve(__dirname, "../../certs");
  return {
    cert: readFileSync(resolve(certsDir, "idp.crt"), "utf-8").trim(),
    key: readFileSync(resolve(certsDir, "idp.key"), "utf-8").trim(),
  };
}

function certBody(cert: string): string {
  return cert
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
}

// ── Build id_token (JWT signed with RS256) ────────────────────────────────────

function buildIdToken(user: AuthUser): string {
  const { key, cert } = getCertAndKey();
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", x5c: [certBody(cert)] }),
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      iss: IDP_ISSUER,
      sub: user.id,
      aud: SF_CLIENT_ID,
      iat: now,
      exp: now + 3600,
      email: user.email,
      name: user.name,
      given_name: user.name.split(" ")[0] ?? user.name,
      family_name:
        (user.name.split(" ").slice(1).join(" ") || user.name.split(" ")[0]) ??
        user.name,
      email_verified: true,
    }),
  ).toString("base64url");

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key, "base64url");

  return `${header}.${payload}.${signature}`;
}

// ── GET /api/oidc/.well-known/openid-configuration ────────────────────────────

router.get(
  "/.well-known/openid-configuration",
  (_req: Request, res: Response) => {
    res.json({
      issuer: IDP_ISSUER,
      authorization_endpoint: `${IDP_ISSUER}/api/oidc/authorize`,
      token_endpoint: `${IDP_ISSUER}/api/oidc/token`,
      userinfo_endpoint: `${IDP_ISSUER}/api/oidc/userinfo`,
      jwks_uri: `${IDP_ISSUER}/api/oidc/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "email"],
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
      ],
      claims_supported: [
        "sub",
        "iss",
        "aud",
        "exp",
        "iat",
        "email",
        "name",
        "given_name",
        "family_name",
      ],
    });
  },
);

// ── GET /api/oidc/jwks — public key for id_token verification ─────────────────

router.get("/jwks", (_req: Request, res: Response) => {
  try {
    const { cert } = getCertAndKey();
    res.json({
      keys: [
        {
          kty: "RSA",
          use: "sig",
          alg: "RS256",
          x5c: [certBody(cert)],
        },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load signing key" });
  }
});

// ── GET /api/oidc/authorize ───────────────────────────────────────────────────

router.get("/authorize", (req: Request, res: Response) => {
  const { client_id, redirect_uri, response_type, state, scope } =
    req.query as Record<string, string>;

  // Validate client
  if (client_id !== SF_CLIENT_ID) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }

  if (response_type !== "code") {
    res.status(400).json({ error: "unsupported_response_type" });
    return;
  }

  // Check JWT session cookie
  const token = req.cookies[getCookieName()] as string | undefined;

  if (!token) {
    // Not logged in — redirect to Sgummalla Works login with return params
    const params = new URLSearchParams({
      redirect_uri: redirect_uri ?? SF_REDIRECT_URI,
      client_id: client_id ?? SF_CLIENT_ID,
      response_type: "code",
      scope: scope ?? "openid profile email",
      ...(state ? { state } : {}),
      oidc_return: "1",
    });
    res.redirect(`/login?${params.toString()}`);
    return;
  }

  try {
    const payload = verifyToken(token);
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
    };

    // Generate auth code
    const code = randomBytes(32).toString("hex");
    authCodes.set(code, {
      code,
      user,
      redirectUri: redirect_uri ?? SF_REDIRECT_URI,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    logger.oidcAuthorize({
      clientId: client_id ?? SF_CLIENT_ID,
      redirectUri: redirect_uri ?? SF_REDIRECT_URI,
      userEmail: user.email,
      userName: user.name,
      code,
      state,
    });

    // Redirect back to Salesforce with code
    const params = new URLSearchParams({ code, ...(state ? { state } : {}) });
    res.redirect(`${redirect_uri ?? SF_REDIRECT_URI}?${params.toString()}`);
  } catch {
    res.clearCookie(getCookieName());
    const params = new URLSearchParams({
      redirect_uri: redirect_uri ?? SF_REDIRECT_URI,
      client_id: client_id ?? SF_CLIENT_ID,
      response_type: "code",
      scope: scope ?? "openid profile email",
      ...(state ? { state } : {}),
      oidc_return: "1",
    });
    res.redirect(`/login?${params.toString()}`);
  }
});

// ── POST /api/oidc/token ──────────────────────────────────────────────────────

router.post("/token", (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;

  const { grant_type, code, redirect_uri, client_id, client_secret } = body;

  // Support Basic auth as well as body params
  let resolvedClientId = client_id;
  let resolvedClientSecret = client_secret;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString(
      "utf-8",
    );
    const [id, secret] = decoded.split(":");
    resolvedClientId = id ?? client_id;
    resolvedClientSecret = secret ?? client_secret;
  }

  // Validate client credentials
  if (
    resolvedClientId !== SF_CLIENT_ID ||
    resolvedClientSecret !== SF_CLIENT_SECRET
  ) {
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  const storedCode = authCodes.get(code);

  if (!storedCode || storedCode.expiresAt < Date.now()) {
    authCodes.delete(code);
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  if (storedCode.redirectUri !== redirect_uri) {
    res
      .status(400)
      .json({ error: "invalid_grant", detail: "redirect_uri mismatch" });
    return;
  }

  // Consume the code
  authCodes.delete(code);

  const { user } = storedCode;
  const idToken = buildIdToken(user);
  const accessToken = signToken(user); // reuse our JWT as access token

  logger.oidcToken({
    clientId: resolvedClientId ?? SF_CLIENT_ID,
    userEmail: user.email,
    userName: user.name,
    grantType: grant_type,
  });

  res.json({
    token_type: "Bearer",
    access_token: accessToken,
    id_token: idToken,
    expires_in: 3600,
    scope: "openid profile email",
  });
});

// ── GET /api/oidc/userinfo ────────────────────────────────────────────────────

router.get("/userinfo", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
    (req.cookies[getCookieName()] as string | undefined);

  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const payload = verifyToken(token);
    const firstName = payload.name.split(" ")[0] ?? payload.name;
    const lastName = payload.name.split(" ").slice(1).join(" ") || firstName;

    logger.oidcUserinfo({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      givenName: firstName,
      familyName: lastName,
    });

    res.json({
      sub: payload.sub,
      email: payload.email,
      email_verified: true,
      name: payload.name,
      given_name: firstName,
      family_name: lastName,
    });
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
});

export default router;
