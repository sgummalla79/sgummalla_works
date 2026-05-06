import client from "./client";
export type {
  SfClient,
  SfUserToken,
  SfTokenResult,
  SoqlResult,
} from "./salesforce";
import type {
  SfClient,
  SfUserToken,
  SfTokenResult,
  SoqlResult,
} from "./salesforce";

// ── Client CRUD (token_exchange flow_type) ────────────────────────────────────

export async function getExchangeClients(): Promise<SfClient[]> {
  const { data } = await client.get<{ clients: SfClient[] }>(
    "/salesforce-exchange/clients",
  );
  return data.clients;
}

export async function createExchangeClient(payload: {
  label: string;
  client_id: string;
  login_url: string;
  private_key: string;
}): Promise<SfClient> {
  const { data } = await client.post<SfClient>(
    "/salesforce-exchange/clients",
    payload,
  );
  return data;
}

export async function updateExchangeClient(
  id: string,
  payload: Partial<{
    label: string;
    client_id: string;
    login_url: string;
    private_key: string;
  }>,
): Promise<SfClient> {
  const { data } = await client.patch<SfClient>(
    `/salesforce-exchange/clients/${id}`,
    payload,
  );
  return data;
}

export async function deleteExchangeClient(id: string): Promise<void> {
  await client.delete(`/salesforce-exchange/clients/${id}`);
}

// ── Token Exchange-specific endpoints ─────────────────────────────────────────

export async function deleteCachedExchangeToken(
  id: string,
  sf_username: string,
): Promise<void> {
  await client.delete(
    `/salesforce-exchange/clients/${id}/tokens/${encodeURIComponent(sf_username)}`,
  );
}

export async function getExchangeClientTokens(
  id: string,
): Promise<SfUserToken[]> {
  const { data } = await client.get<{ tokens: SfUserToken[] }>(
    `/salesforce-exchange/clients/${id}/tokens`,
  );
  return data.tokens;
}

// Identity comes from the Auth0 id_token stored at login — no params needed
export async function getExchangeToken(id: string): Promise<SfTokenResult> {
  const { data } = await client.post<SfTokenResult>(
    `/salesforce-exchange/clients/${id}/token`,
  );
  return data;
}

export async function refreshExchangeToken(
  id: string,
  sf_username: string,
): Promise<SfTokenResult> {
  const { data } = await client.post<SfTokenResult>(
    `/salesforce-exchange/clients/${id}/token/refresh`,
    { sf_username },
  );
  return data;
}

export interface FrontdoorLog {
  step: string;
  status: "ok" | "cached" | "info";
}

export interface FrontdoorResult {
  url: string;
  logs: FrontdoorLog[];
}

export async function getSfFrontdoorUrl(id: string): Promise<FrontdoorResult> {
  const { data } = await client.get<FrontdoorResult>(
    `/salesforce-exchange/clients/${id}/frontdoor`,
  );
  return data;
}

export async function runExchangeSoqlQuery(
  id: string,
  sf_username: string,
  soql: string,
): Promise<SoqlResult> {
  const { data } = await client.post<SoqlResult>(
    `/salesforce-exchange/clients/${id}/query`,
    { sf_username, soql },
  );
  return data;
}
