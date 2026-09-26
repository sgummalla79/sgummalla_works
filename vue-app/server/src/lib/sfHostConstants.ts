// Salesforce-owned domains that Salesforce endpoints (login, instance, Lightning
// Out) can legitimately resolve to. These are platform-defined, so they cannot
// come from the database; deployments with other domains (e.g. Government
// Cloud) override them via SF_ALLOWED_HOST_SUFFIXES.
export const DEFAULT_SF_HOST_SUFFIXES = [".salesforce.com", ".force.com"];

// Env var holding a comma-separated override of the allowed host suffixes.
export const SF_HOST_SUFFIXES_ENV = "SF_ALLOWED_HOST_SUFFIXES";

// Only HTTPS is ever acceptable for endpoints that receive tokens. Fixed by the
// security requirement, not org configuration.
export const SF_REQUIRED_PROTOCOL = "https:";
