/**
 * One-time backfill: encrypts Salesforce/Auth0 secrets that were stored as
 * plaintext (user_id_tokens.id_token, sf_tokens access/refresh tokens,
 * sf_clients.private_key). Idempotent — already-encrypted values are skipped.
 *
 * Requires TOKEN_ENCRYPTION_KEY. Run from the server directory:
 *   pnpm encrypt:secrets
 */

import "dotenv/config";
import sql from "../lib/db.js";
import { tokenCipher } from "../lib/tokenCrypto.js";
import { ENCRYPTED_VALUE_PREFIX } from "../lib/secretCipherConstants.js";

const NOT_ENCRYPTED = `${ENCRYPTED_VALUE_PREFIX}%`;

async function main(): Promise<void> {
  let total = 0;

  const idTokens = await sql`
    SELECT user_id, id_token FROM user_id_tokens WHERE id_token NOT LIKE ${NOT_ENCRYPTED}
  `;
  for (const r of idTokens) {
    await sql`UPDATE user_id_tokens SET id_token = ${tokenCipher.encrypt(r.id_token as string)} WHERE user_id = ${r.user_id}`;
  }
  console.log(`user_id_tokens.id_token: ${idTokens.length} encrypted`);
  total += idTokens.length;

  const tokens = await sql`
    SELECT id, access_token, refresh_token FROM sf_tokens
    WHERE access_token NOT LIKE ${NOT_ENCRYPTED}
       OR (refresh_token IS NOT NULL AND refresh_token NOT LIKE ${NOT_ENCRYPTED})
  `;
  for (const r of tokens) {
    const access = tokenCipher.isEncrypted(r.access_token as string)
      ? (r.access_token as string)
      : tokenCipher.encrypt(r.access_token as string);
    const refresh =
      r.refresh_token && !tokenCipher.isEncrypted(r.refresh_token as string)
        ? tokenCipher.encrypt(r.refresh_token as string)
        : (r.refresh_token as string | null);
    await sql`UPDATE sf_tokens SET access_token = ${access}, refresh_token = ${refresh} WHERE id = ${r.id}`;
  }
  console.log(`sf_tokens: ${tokens.length} rows encrypted`);
  total += tokens.length;

  const clients = await sql`
    SELECT id, private_key FROM sf_clients WHERE private_key NOT LIKE ${NOT_ENCRYPTED}
  `;
  for (const r of clients) {
    await sql`UPDATE sf_clients SET private_key = ${tokenCipher.encrypt(r.private_key as string)} WHERE id = ${r.id}`;
  }
  console.log(`sf_clients.private_key: ${clients.length} encrypted`);
  total += clients.length;

  console.log(`Done — ${total} values encrypted.`);
  await sql.end();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  await sql.end();
  process.exit(1);
});
