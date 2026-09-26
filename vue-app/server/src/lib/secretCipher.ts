import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  CIPHER_ALGORITHM,
  ENCRYPTED_VALUE_PREFIX,
  IV_BYTES,
  KEY_HEX_LENGTH,
} from "./secretCipherConstants.js";

export interface SecretCipher {
  encrypt(plaintext: string): string;
  // Legacy plaintext (no prefix) is returned unchanged so existing rows keep
  // working until they are next written or backfilled.
  decrypt(stored: string): string;
  isEncrypted(stored: string): boolean;
}

// Builds an AES-256-GCM cipher whose key comes from the named env var. The key
// is read on use, so a missing key fails the operation instead of the boot.
export function createSecretCipher(keyEnvVar: string): SecretCipher {
  function getKey(): Buffer {
    const hex = process.env[keyEnvVar];
    if (!hex || hex.length !== KEY_HEX_LENGTH) {
      throw new Error(
        `${keyEnvVar} must be a ${KEY_HEX_LENGTH}-char hex string (32 bytes)`,
      );
    }
    return Buffer.from(hex, "hex");
  }

  const isEncrypted = (stored: string) =>
    stored.startsWith(ENCRYPTED_VALUE_PREFIX);

  return {
    isEncrypted,

    encrypt(plaintext) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(CIPHER_ALGORITHM, getKey(), iv);
      const data = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      return (
        ENCRYPTED_VALUE_PREFIX +
        [iv, cipher.getAuthTag(), data].map((b) => b.toString("hex")).join(":")
      );
    },

    decrypt(stored) {
      if (!isEncrypted(stored)) return stored;
      const [ivHex, tagHex, dataHex] = stored
        .slice(ENCRYPTED_VALUE_PREFIX.length)
        .split(":");
      const decipher = createDecipheriv(
        CIPHER_ALGORITHM,
        getKey(),
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(tagHex, "hex"));
      return Buffer.concat([
        decipher.update(Buffer.from(dataHex, "hex")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}
