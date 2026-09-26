import { logger } from "./logger.js";
import { normalizeSalesforceOrigin } from "./sfHostAllowlist.js";

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
  // The id_token is sent to this host, so it must be a Salesforce host.
  const loginOrigin = normalizeSalesforceOrigin(loginUrl, "login_url");
  const tokenUrl = `${loginOrigin}/services/oauth2/token`;

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
  // instance_url comes from the response; never send the new access token (or
  // let the browser load scripts) from a host outside Salesforce.
  const instanceOrigin = normalizeSalesforceOrigin(
    data.instance_url,
    "instance_url",
  );
  const sf_username = await fetchSfUsername(data.access_token, instanceOrigin);

  logger.debug("SF Token Exchange — success", {
    sf_username,
    instance_url: instanceOrigin,
  });
  return {
    access_token: data.access_token,
    instance_url: instanceOrigin,
    sf_username,
  };
}
