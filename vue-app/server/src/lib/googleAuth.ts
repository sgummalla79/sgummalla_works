import { createSign } from "node:crypto";

interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();

function parseServiceAccount(): ServiceAccountJson {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not set");
  return JSON.parse(raw) as ServiceAccountJson;
}

export async function getGoogleAccessToken(scope: string): Promise<string> {
  const hit = tokenCache.get(scope);
  if (hit && Date.now() < hit.expiresAt) return hit.value;

  const sa = parseServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";

  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: tokenUri,
      exp: now + 3600,
      iat: now,
    }),
  ).toString("base64url");

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const sig = signer.sign(sa.private_key, "base64url");

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${payload}.${sig}`,
    }),
  });

  if (!res.ok) throw new Error(`Google OAuth2 token: HTTP ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache.set(scope, {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });
  return data.access_token;
}
