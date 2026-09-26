import sql from "./db.js";

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
