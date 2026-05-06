import sql from "./db.js";

export interface TokenPayload {
  access_token: string;
  refresh_token?: string | null;
  instance_url: string;
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
      ${token.access_token}, ${token.refresh_token ?? null}, ${token.instance_url}
    )
    ON CONFLICT (client_db_id, sf_username) DO UPDATE SET
      access_token  = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, sf_tokens.refresh_token),
      instance_url  = EXCLUDED.instance_url,
      issued_at     = now()
    RETURNING id, sf_username, access_token, refresh_token, instance_url, issued_at
  `;
  return row;
}

export async function getValidSfToken(clientDbId: string, sfUsername: string) {
  const [row] = await sql`
    SELECT access_token, refresh_token, instance_url, issued_at
    FROM sf_tokens
    WHERE client_db_id = ${clientDbId}
      AND sf_username = ${sfUsername}
      AND issued_at > now() - interval '90 minutes'
  `;
  return row ?? null;
}
