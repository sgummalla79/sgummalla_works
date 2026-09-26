import sql from "./db.js";
import { openSecret, sealSecret } from "./tokenCrypto.js";

// The only place user_id_tokens is read or written, so the Auth0 id_token is
// always encrypted at rest.
export async function saveIdToken(
  userId: string,
  idToken: string,
): Promise<void> {
  await sql`
    INSERT INTO user_id_tokens (user_id, id_token)
    VALUES (${userId}, ${sealSecret(idToken)})
    ON CONFLICT (user_id) DO UPDATE SET
      id_token   = EXCLUDED.id_token,
      updated_at = now()
  `;
}

export async function getIdToken(userId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT id_token FROM user_id_tokens WHERE user_id = ${userId}
  `;
  return openSecret(row?.id_token as string | undefined);
}
