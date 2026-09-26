import {
  DEFAULT_SF_HOST_SUFFIXES,
  SF_HOST_SUFFIXES_ENV,
  SF_REQUIRED_PROTOCOL,
} from "./sfHostConstants.js";

// Suffixes are normalised to a leading "." so ".salesforce.com" matches
// "x.salesforce.com" but never "evilsalesforce.com".
function allowedSuffixes(): string[] {
  const raw = process.env[SF_HOST_SUFFIXES_ENV];
  const configured = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const suffixes = configured.length ? configured : DEFAULT_SF_HOST_SUFFIXES;
  return suffixes.map((s) => (s.startsWith(".") ? s : `.${s}`));
}

// Throws unless `raw` is an https URL on an allowed Salesforce host with no
// embedded credentials and no custom port. Guards every URL the server sends
// tokens to, and every URL the browser is told to load, against SSRF and
// attacker-controlled redirection of the flow.
export function assertSalesforceUrl(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }

  const host = url.hostname.toLowerCase();
  const allowed = allowedSuffixes().some((suffix) => host.endsWith(suffix));

  if (
    url.protocol !== SF_REQUIRED_PROTOCOL ||
    url.username ||
    url.password ||
    url.port ||
    !allowed
  ) {
    throw new Error(`${label} must be an https Salesforce URL`);
  }
  return url;
}

// Validates and reduces a base URL (login/instance) to its origin.
export function normalizeSalesforceOrigin(raw: string, label: string): string {
  return assertSalesforceUrl(raw, label).origin;
}
