import { assertSalesforceUrl } from "./lightningOut";
import {
  SALESFORCE_LOGOUT_PATH,
  SALESFORCE_LOGOUT_TIMEOUT_MS,
} from "./sessionConstants";

// Ends the browser's Salesforce session by calling Salesforce's logout page with
// the session cookie attached, so Salesforce clears it. A request is used, not a
// hidden frame, because Salesforce pages refuse to render inside frames. The
// response is opaque and ignored; this never throws, because signing out of this
// site must not depend on Salesforce being reachable.
export async function signOutOfSalesforce(logoutUrls: string[]): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    SALESFORCE_LOGOUT_TIMEOUT_MS,
  );

  await Promise.all(
    logoutUrls.map(async (url) => {
      try {
        assertSalesforceUrl(url, "Salesforce logout URL");
        await fetch(url, {
          mode: "no-cors",
          credentials: "include",
          signal: controller.signal,
        });
      } catch {
        /* best effort */
      }
    }),
  );
  clearTimeout(timer);
}

// The logout URL for the Salesforce org a Lightning Out session belongs to.
export function salesforceLogoutUrlFor(salesforceUrl: string): string {
  return `${new URL(salesforceUrl).origin}${SALESFORCE_LOGOUT_PATH}`;
}
