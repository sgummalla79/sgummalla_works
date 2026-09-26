import sql from "./db.js";
import { tokenCipher } from "./tokenCrypto.js";

export interface OwnedExchangeClient {
  id: string;
  label: string;
  client_id: string;
  login_url: string;
}

// Every lookup of a token-exchange client by id must go through here so that
// ownership (user_id) is enforced in exactly one place. Returns null both when
// the client does not exist and when it belongs to someone else, so callers
// cannot distinguish the two.
export async function findOwnedExchangeClient(
  id: string,
  userId: string,
): Promise<OwnedExchangeClient | null> {
  const [row] = await sql`
    SELECT id, label, client_id, login_url
    FROM sf_clients
    WHERE id = ${id} AND flow_type = 'token_exchange' AND user_id = ${userId}
  `;
  return (row as OwnedExchangeClient | undefined) ?? null;
}

export interface OwnedJwtBearerClient extends OwnedExchangeClient {
  private_key: string;
}

// Same ownership rule for JWT bearer clients, which additionally carry the
// private key used to sign assertions on the user's behalf.
export async function findOwnedJwtBearerClient(
  id: string,
  userId: string,
): Promise<OwnedJwtBearerClient | null> {
  const [row] = await sql`
    SELECT id, label, client_id, login_url, private_key
    FROM sf_clients
    WHERE id = ${id} AND flow_type = 'jwt_bearer' AND user_id = ${userId}
  `;
  if (!row) return null;
  return {
    ...(row as OwnedJwtBearerClient),
    private_key: tokenCipher.decrypt(row.private_key as string),
  };
}
