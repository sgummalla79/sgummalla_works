import { logger } from "./logger.js";
import {
  assertSalesforceUrl,
  normalizeSalesforceOrigin,
} from "./sfHostAllowlist.js";

// Trades an access token for a single-use frontdoor URL at a UI Bridge endpoint.
// The access token is sent server-to-server only; the browser receives just the
// short-lived, single-use frontdoor URL, never the token itself.
export async function requestFrontdoorUri(
  instanceUrl: string,
  endpointPath: string,
  accessToken: string,
  extraParams: Record<string, string> = {},
): Promise<string> {
  const base = normalizeSalesforceOrigin(instanceUrl, "instance_url");
  const res = await fetch(`${base}${endpointPath}`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: accessToken, ...extraParams }),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error("SF frontdoor request failed", {
      endpointPath,
      status: res.status,
      body: text,
    });
    throw new Error(`Frontdoor request failed (HTTP ${res.status})`);
  }

  const { frontdoor_uri } = JSON.parse(text) as { frontdoor_uri?: string };
  if (!frontdoor_uri) throw new Error("Salesforce returned no frontdoor URL");

  // The browser navigates to this URL, so it must also be a Salesforce host.
  return assertSalesforceUrl(frontdoor_uri, "frontdoor_uri").toString();
}
