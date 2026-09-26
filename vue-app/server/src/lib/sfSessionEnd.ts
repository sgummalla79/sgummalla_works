import { logger } from "./logger.js";
import { normalizeSalesforceOrigin } from "./sfHostAllowlist.js";
import { takeUserSfTokens } from "./sfTokenDb.js";
import { SF_LOGOUT_PATH, SF_REVOKE_PATH } from "./sfSessionConstants.js";

// Ends the user's Salesforce access on logout: deletes their stored tokens,
// revokes each at Salesforce (best effort), and returns the Salesforce logout
// URLs the browser must visit to drop its own Salesforce session cookie.
export async function endSalesforceSessions(userId: string): Promise<string[]> {
  const tokens = await takeUserSfTokens(userId);
  const origins = new Set<string>();

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const origin = normalizeSalesforceOrigin(
          token.instance_url,
          "instance_url",
        );
        origins.add(origin);
        await fetch(`${origin}${SF_REVOKE_PATH}`, {
          method: "POST",
          redirect: "error",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: token.access_token }),
        });
      } catch (err) {
        // Logout must never fail because Salesforce was unreachable.
        logger.error("SF logout — token revoke failed", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  return [...origins].map((origin) => `${origin}${SF_LOGOUT_PATH}`);
}
