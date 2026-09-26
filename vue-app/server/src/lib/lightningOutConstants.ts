// Salesforce-defined paths for Lightning Out 2.0. They are fixed by the
// platform (not org configuration), so they cannot be externalised.
export const LIGHTNING_OUT_SINGLE_ACCESS_PATH =
  "/services/oauth2/lightningoutsingleaccess";
export const LIGHTNING_OUT_SCRIPT_PATH =
  "/lightning/lightning.out.latest/index.iife.prod.js";

// Standard UI Bridge (Single Access) endpoint that trades an access token for a
// single-use frontdoor URL. Fixed by the platform.
export const SINGLE_ACCESS_PATH = "/services/oauth2/singleaccess";
