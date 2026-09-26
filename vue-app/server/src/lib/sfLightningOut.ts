import { normalizeSalesforceOrigin } from "./sfHostAllowlist.js";
import { requestFrontdoorUri } from "./sfFrontdoor.js";
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
  const frontdoorUrl = await requestFrontdoorUri(
    base,
    LIGHTNING_OUT_SINGLE_ACCESS_PATH,
    accessToken,
    { lightning_out_app_id: config.appId },
  );

  return {
    frontdoorUrl,
    scriptUrl: `${base}${LIGHTNING_OUT_SCRIPT_PATH}`,
    appId: config.appId,
    components: config.components,
  };
}
