import { createSign } from "node:crypto";
import { logger } from "./logger.js";

export interface SfTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
}

// ── Mint JWT assertion ────────────────────────────────────────────────────────

function mintJWT(
  clientId: string,
  sfUsername: string,
  loginUrl: string,
  privateKey: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientId,
    sub: sfUsername,
    aud: loginUrl,
    exp: now + 300,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(privateKey, "base64url")}`;
}

// ── Parse token endpoint response ────────────────────────────────────────────

function parseTokenResponse(status: number, text: string): SfTokenResponse {
  if (status < 200 || status >= 300) {
    let parsed: { error?: string; error_description?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      /* ignore */
    }
    const msg =
      parsed.error_description ??
      parsed.error ??
      `Token exchange failed (HTTP ${status})`;
    logger.error("SF Bearer — exchange failed", { status, body: text });
    throw new Error(msg);
  }

  const data = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    instance_url: string;
  };

  return {
    access_token: data.access_token,
    instance_url: data.instance_url,
    ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
  };
}

// ── JWT Bearer exchange ───────────────────────────────────────────────────────

export async function mintAndExchangeJWT(
  clientId: string,
  sfUsername: string,
  loginUrl: string,
  privateKey: string,
): Promise<SfTokenResponse> {
  const tokenUrl = `${loginUrl.replace(/\/$/, "")}/services/oauth2/token`;

  const jwt = mintJWT(clientId, sfUsername, loginUrl, privateKey);

  const res = await fetch(tokenUrl, {
    method: "POST",
    redirect: "error", // never follow redirects — this is a server-to-server call only
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  return parseTokenResponse(res.status, await res.text());
}

// ── Refresh token exchange ────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  loginUrl: string,
): Promise<SfTokenResponse> {
  const tokenUrl = `${loginUrl.replace(/\/$/, "")}/services/oauth2/token`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  return parseTokenResponse(res.status, await res.text());
}
