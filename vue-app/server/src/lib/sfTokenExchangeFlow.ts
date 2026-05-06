import { logger } from "./logger.js";

// ── Resolve Salesforce username from access token ─────────────────────────────

async function fetchSfUsername(
  accessToken: string,
  instanceUrl: string,
): Promise<string> {
  const res = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
    redirect: "error",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Salesforce user info");
  const data = (await res.json()) as {
    preferred_username?: string;
    username?: string;
  };
  return data.preferred_username ?? data.username ?? "unknown";
}

// ── True Token Exchange ───────────────────────────────────────────────────────
// Forwards the caller's Auth0 id_token directly as subject_token.
// Salesforce invokes the Apex handler which decodes the Auth0 JWT to identify the user.
// No JWT minting — the token already exists from the user's Auth0 login.

export async function exchangeWebAppToken(
  clientId: string,
  idToken: string,
  loginUrl: string,
): Promise<{
  access_token: string;
  instance_url: string;
  sf_username: string;
}> {
  const tokenUrl = `${loginUrl.replace(/\/$/, "")}/services/oauth2/token`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: idToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      client_id: clientId,
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    let parsed: { error?: string; error_description?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      /* ignore */
    }
    const msg =
      parsed.error_description ??
      parsed.error ??
      `Exchange failed (HTTP ${res.status})`;
    logger.error("SF Token Exchange — failed", {
      status: res.status,
      body: text,
    });
    throw new Error(msg);
  }

  const data = JSON.parse(text) as {
    access_token: string;
    instance_url: string;
  };
  const sf_username = await fetchSfUsername(
    data.access_token,
    data.instance_url,
  );

  logger.debug("SF Token Exchange — success", {
    sf_username,
    instance_url: data.instance_url,
  });
  return {
    access_token: data.access_token,
    instance_url: data.instance_url,
    sf_username,
  };
}
