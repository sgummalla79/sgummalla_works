import type { LightningOutSession } from "../api/salesforceExchange";
import {
  LIGHTNING_OUT_READY_TIMEOUT_MS,
  SALESFORCE_HOST_SUFFIXES,
  SALESFORCE_REQUIRED_PROTOCOL,
} from "./lightningOutConstants";

// Custom element name defined by Salesforce's Lightning Out 2.0 script.
const LIGHTNING_OUT_APP_TAG = "lightning-out-application";

// Throws unless `raw` is an https URL on a Salesforce host, so a tampered
// response can never make the page load a foreign script or frame.
export function assertSalesforceUrl(raw: string, label: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== SALESFORCE_REQUIRED_PROTOCOL ||
    !SALESFORCE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new Error(`${label} must be an https Salesforce URL`);
  }
}

const loadedScripts = new Map<string, Promise<void>>();

// Lightning Out 2.0 must be loaded by the host page (Lightning Web Security
// blocks script insertion from inside components). Loaded once per URL.
export function loadLightningOutScript(scriptUrl: string): Promise<void> {
  try {
    assertSalesforceUrl(scriptUrl, "Lightning Out script URL");
  } catch (err) {
    return Promise.reject(err);
  }
  const cached = loadedScripts.get(scriptUrl);
  if (cached) return cached;

  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadedScripts.delete(scriptUrl);
      reject(new Error("Could not load the Lightning Out script"));
    };
    document.head.appendChild(script);
  });
  loadedScripts.set(scriptUrl, pending);
  return pending;
}

// Renders the Lightning Out app and its components into `container`.
export async function mountLightningOut(
  container: HTMLElement,
  session: Pick<
    LightningOutSession,
    "frontdoorUrl" | "scriptUrl" | "appId" | "components"
  >,
): Promise<void> {
  assertSalesforceUrl(session.frontdoorUrl, "Lightning Out frontdoor URL");
  await loadLightningOutScript(session.scriptUrl);

  const app = document.createElement(LIGHTNING_OUT_APP_TAG);
  app.setAttribute("frontdoor-url", session.frontdoorUrl);
  app.setAttribute("app-id", session.appId);
  app.setAttribute("components", session.components.join(", "));
  container.replaceChildren(app);

  for (const name of session.components) {
    container.appendChild(document.createElement(name));
  }
}

// Resolves once Salesforce has registered every embedded component (i.e. the
// session is established and the components can render), or after the timeout.
export async function waitForLightningOutComponents(
  components: string[],
): Promise<void> {
  const registered = Promise.all(
    components.map((name) => customElements.whenDefined(name)),
  );
  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, LIGHTNING_OUT_READY_TIMEOUT_MS),
  );
  await Promise.race([registered, timeout]);
}
