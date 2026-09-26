import { logger } from "./logger.js";
import {
  assertSalesforceUrl,
  normalizeSalesforceOrigin,
} from "./sfHostAllowlist.js";
import {
  LIGHTNING_OUT_SCRIPT_PATH,
  LIGHTNING_OUT_SINGLE_ACCESS_PATH,
} from "./lightningOutConstants.js";

export interface LightningOutConfig {
  appId: string;
  components: string[];
}

export interface LightningOutSession {
  frontdoorUrl: string;
  scriptUrl: string;
  appId: string;
  components: string[];
}

// The Lightning Out 2.0 app ID and component list are org configuration.
export function getLightningOutConfig(): LightningOutConfig {
  const appId = process.env.LIGHTNING_OUT_APP_ID;
  const components = (process.env.LIGHTNING_OUT_COMPONENTS ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (!appId) throw new Error("LIGHTNING_OUT_APP_ID is not set");
  if (components.length === 0) {
    throw new Error("LIGHTNING_OUT_COMPONENTS is not set");
  }
  return { appId, components };
}

// Exchanges an OAuth access token (web/full scope) for a single-use frontdoor
// URL that establishes a session for the Lightning Out 2.0 app.
export async function requestLightningOutSession(
  instanceUrl: string,
  accessToken: string,
  config: LightningOutConfig,
): Promise<LightningOutSession> {
  const base = normalizeSalesforceOrigin(instanceUrl, "instance_url");
  const res = await fetch(`${base}${LIGHTNING_OUT_SINGLE_ACCESS_PATH}`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: accessToken,
      lightning_out_app_id: config.appId,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error("SF Lightning Out — frontdoor request failed", {
      status: res.status,
      body: text,
    });
    throw new Error(`Lightning Out session failed (HTTP ${res.status})`);
  }

  const { frontdoor_uri } = JSON.parse(text) as { frontdoor_uri?: string };
  if (!frontdoor_uri)
    throw new Error("Lightning Out returned no frontdoor URL");

  // The browser navigates to this URL, so it must also be a Salesforce host.
  const frontdoorUrl = assertSalesforceUrl(
    frontdoor_uri,
    "frontdoor_uri",
  ).toString();

  return {
    frontdoorUrl,
    scriptUrl: `${base}${LIGHTNING_OUT_SCRIPT_PATH}`,
    appId: config.appId,
    components: config.components,
  };
}
