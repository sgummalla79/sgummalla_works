import client from "./client";

export interface SfClient {
  id: string;
  label: string;
  client_id: string;
  login_url: string;
  created_at: string;
}

export interface SfUserToken {
  sf_username: string;
  instance_url: string;
  issued_at: string;
  has_refresh_token: boolean;
}

export interface SfTokenResult {
  sf_username: string;
  access_token: string;
  refresh_token: string | null;
  instance_url: string;
  issued_at: string;
  from_cache: boolean;
}

export async function getSfClients(): Promise<SfClient[]> {
  const { data } = await client.get<{ clients: SfClient[] }>(
    "/salesforce/clients",
  );
  return data.clients;
}

export async function createSfClient(payload: {
  label: string;
  client_id: string;
  login_url: string;
  private_key: string;
}): Promise<SfClient> {
  const { data } = await client.post<SfClient>("/salesforce/clients", payload);
  return data;
}

export async function updateSfClient(
  id: string,
  payload: Partial<{
    label: string;
    client_id: string;
    login_url: string;
    private_key: string;
  }>,
): Promise<SfClient> {
  const { data } = await client.patch<SfClient>(
    `/salesforce/clients/${id}`,
    payload,
  );
  return data;
}

export async function deleteSfClient(id: string): Promise<void> {
  await client.delete(`/salesforce/clients/${id}`);
}

export async function deleteCachedToken(
  id: string,
  sf_username: string,
): Promise<void> {
  await client.delete(
    `/salesforce/clients/${id}/tokens/${encodeURIComponent(sf_username)}`,
  );
}

export async function getClientTokens(id: string): Promise<SfUserToken[]> {
  const { data } = await client.get<{ tokens: SfUserToken[] }>(
    `/salesforce/clients/${id}/tokens`,
  );
  return data.tokens;
}

export async function getSfToken(
  id: string,
  sf_username: string,
): Promise<SfTokenResult> {
  const { data } = await client.post<SfTokenResult>(
    `/salesforce/clients/${id}/token`,
    { sf_username },
  );
  return data;
}

export interface SoqlResult {
  records: Record<string, unknown>[];
  totalSize: number;
  done: boolean;
}

export async function runSoqlQuery(
  id: string,
  sf_username: string,
  soql: string,
): Promise<SoqlResult> {
  const { data } = await client.post<SoqlResult>(
    `/salesforce/clients/${id}/query`,
    { sf_username, soql },
  );
  return data;
}

export async function refreshSfToken(
  id: string,
  sf_username: string,
): Promise<SfTokenResult> {
  const { data } = await client.post<SfTokenResult>(
    `/salesforce/clients/${id}/token/refresh`,
    { sf_username },
  );
  return data;
}
