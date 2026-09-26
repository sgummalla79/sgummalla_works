import { createSecretCipher } from "./secretCipher.js";
import { TOKEN_ENCRYPTION_KEY_ENV } from "./secretCipherConstants.js";

// The one cipher used for every Salesforce/Auth0 secret stored in Postgres.
export const tokenCipher = createSecretCipher(TOKEN_ENCRYPTION_KEY_ENV);

// Null-safe wrappers for optional columns such as refresh_token.
export const sealSecret = (value: string | null | undefined) =>
  value ? tokenCipher.encrypt(value) : null;

export const openSecret = (stored: string | null | undefined) =>
  stored ? tokenCipher.decrypt(stored) : null;
