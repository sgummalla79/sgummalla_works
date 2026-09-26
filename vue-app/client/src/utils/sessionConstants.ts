// Path of the login page; the router's login route uses the same value.
export const LOGIN_PATH = "/login";

// How long logout waits for Salesforce's logout pages to load before moving on.
// A UI timing guard, not org configuration.
export const SALESFORCE_LOGOUT_TIMEOUT_MS = 3000;

// Salesforce's logout endpoint, appended to a Salesforce origin. Fixed by the
// platform.
export const SALESFORCE_LOGOUT_PATH = "/secur/logout.jsp";
