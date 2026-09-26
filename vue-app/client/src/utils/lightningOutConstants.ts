// Upper bound on how long the panel shows its loading state waiting for
// Salesforce to register the embedded components. Purely a UI timing guard;
// it cannot be derived from the org, so it lives here as a named constant.
export const LIGHTNING_OUT_READY_TIMEOUT_MS = 20000;

// Hosts the browser may load Salesforce scripts/frontdoor URLs from. Defence in
// depth mirroring the server allowlist; these are platform-defined domains.
export const SALESFORCE_HOST_SUFFIXES = [".salesforce.com", ".force.com"];

// Salesforce endpoints are only ever served over HTTPS.
export const SALESFORCE_REQUIRED_PROTOCOL = "https:";
