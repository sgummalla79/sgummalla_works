import client from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  provider: "credentials" | "auth0" | "saml" | "oidc";
}

export interface Auth0Connection {
  name: string;
  label: string;
  strategy: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  user: ApiUser;
}

// ── Calls ─────────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<ApiUser> {
  const { data } = await client.post<AuthResponse>("/auth/login", payload);
  return data.user;
}

export async function logout(): Promise<void> {
  await client.post("/auth/logout");
}

export async function me(): Promise<ApiUser> {
  const { data } = await client.get<AuthResponse>("/auth/me");
  return data.user;
}

export interface PendingLink {
  primaryProvider: string;
  secondaryProvider: string;
  email: string;
}

export async function fetchPendingLink(): Promise<PendingLink | null> {
  try {
    const { data } = await client.get<PendingLink>("/auth0/pending-link");
    return data;
  } catch {
    return null;
  }
}

export async function fetchIdToken(): Promise<string | null> {
  try {
    const { data } = await client.get<{ idToken: string }>("/auth/id-token");
    return data.idToken;
  } catch {
    return null;
  }
}

export async function fetchAuth0Connections(): Promise<Auth0Connection[]> {
  try {
    const { data } = await client.get<Auth0Connection[]>("/auth0/connections");
    return data;
  } catch {
    return [];
  }
}

// ── Federated auth initiators — browser redirects ─────────────────────────────
// These are not Axios calls — the browser navigates directly to the server
// which handles the redirect to the identity provider.

export function initiateAuth0(connection?: string): void {
  const base = `${import.meta.env.VITE_API_URL ?? ""}/api/auth0/initiate`;
  const url = connection
    ? `${base}?connection=${encodeURIComponent(connection)}`
    : base;
  window.location.href = url;
}
