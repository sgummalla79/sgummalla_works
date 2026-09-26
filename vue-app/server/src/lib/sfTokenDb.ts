import sql from "./db.js";
import { openSecret, sealSecret } from "./tokenCrypto.js";

export interface TokenPayload {
  access_token: string;
  refresh_token?: string | null;
  instance_url: string;
}

// access_token and refresh_token are encrypted at rest. Callers always get the
// decrypted values back; the ciphertext never leaves this module.
function open<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    access_token: openSecret(row.access_token as string),
    refresh_token: openSecret(row.refresh_token as string | null),
  };
}

export async function upsertSfToken(
  clientDbId: string,
  sfUsername: string,
  token: TokenPayload,
) {
  const [row] = await sql`
    INSERT INTO sf_tokens (client_db_id, sf_username, access_token, refresh_token, instance_url)
    VALUES (
      ${clientDbId}, ${sfUsername},
      ${sealSecret(token.access_token)}, ${sealSecret(token.refresh_token)}, ${token.instance_url}
    )
    ON CONFLICT (client_db_id, sf_username) DO UPDATE SET
      access_token  = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, sf_tokens.refresh_token),
      instance_url  = EXCLUDED.instance_url,
      issued_at     = now()
    RETURNING id, sf_username, access_token, refresh_token, instance_url, issued_at
  `;
  return open(row);
}

export async function getValidSfToken(clientDbId: string, sfUsername: string) {
  const [row] = await sql`
    SELECT access_token, refresh_token, instance_url, issued_at
    FROM sf_tokens
    WHERE client_db_id = ${clientDbId}
      AND sf_username = ${sfUsername}
      AND issued_at > now() - interval '90 minutes'
  `;
  return row ? open(row) : null;
}

export async function getStoredRefreshToken(
  clientDbId: string,
  sfUsername: string,
): Promise<string | null> {
  const [row] = await sql`
    SELECT refresh_token FROM sf_tokens
    WHERE client_db_id = ${clientDbId} AND sf_username = ${sfUsername}
  `;
  return openSecret(row?.refresh_token as string | null | undefined);
}

// Removes every Salesforce token the user holds (across all their clients) and
// returns them decrypted, so the caller can revoke them at Salesforce.
export async function takeUserSfTokens(userId: string) {
  const rows = await sql`
    DELETE FROM sf_tokens
    WHERE client_db_id IN (SELECT id FROM sf_clients WHERE user_id = ${userId})
    RETURNING access_token, instance_url
  `;
  return rows.map((r) => ({
    access_token: openSecret(r.access_token as string) as string,
    instance_url: r.instance_url as string,
  }));
}
