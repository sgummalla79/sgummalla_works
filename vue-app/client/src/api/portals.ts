import client from "./client";

export interface Portal {
  id: string;
  name: string;
  protocol: "saml" | "oidc" | "auth0" | "jwt" | "token-exchange";
  description: string;
  launchUrl?: string;
  external?: boolean;
  disabled?: boolean;
  clients?: Array<{ id: string; label: string }>;
}

interface PortalsResponse {
  portals: Portal[];
}

export async function getPortals(): Promise<Portal[]> {
  const { data } = await client.get<PortalsResponse>("/portals");
  return data.portals;
}
