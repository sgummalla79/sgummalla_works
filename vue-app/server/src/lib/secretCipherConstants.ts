// Env var holding the 64-hex-char (32-byte) key that encrypts Salesforce/Auth0
// secrets at rest. Named here so the key source is defined in one place.
export const TOKEN_ENCRYPTION_KEY_ENV = "TOKEN_ENCRYPTION_KEY";

// Marks a stored value as encrypted, and versions the format so the algorithm
// or key can be rotated later. Values without it are legacy plaintext.
export const ENCRYPTED_VALUE_PREFIX = "enc:v1:";

// AES-256-GCM parameters. Fixed by the algorithm, not configuration.
export const CIPHER_ALGORITHM = "aes-256-gcm";
export const KEY_HEX_LENGTH = 64;
export const IV_BYTES = 12;
