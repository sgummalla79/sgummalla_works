import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import sql from "../lib/db.js";

const router: import("express").Router = Router();

router.use(requireAuth);

// ── GET /api/portals ──────────────────────────────────────────────────────────

type PortalEntry = {
  id: string;
  name: string;
  protocol: string;
  description: string;
  launchUrl?: string;
  external?: boolean;
  disabled?: boolean;
  clients?: Array<{ id: string; label: string }>;
  allowedUserIds?: string[];
};

router.get("/", async (req: Request, res: Response) => {
  const allPortals: PortalEntry[] = [
    {
      id: "support-portal",
      name: "Support Portal",
      protocol: "saml",
      description:
        "SP-initiated SAML 2.0 SSO — browser redirects to your Identity Provider for assertion-based authentication.",
      launchUrl: "https://support.sgummalla.net/login",
      external: true,
      disabled: true,
    },
    {
      id: "help-portal",
      name: "Help Portal",
      protocol: "oidc",
      description:
        "OpenID Connect authorization code flow — Identity Provider issues tokens on successful user authentication.",
      launchUrl: "https://help.sgummalla.net/login",
      external: true,
      disabled: true,
    },
  ];

  // Token Exchange portal — lists only the requesting user's registered clients
  const userId = req.user?.id ?? "";
  const exchangeClients = await sql<{ id: string; label: string }[]>`
    SELECT id, label FROM sf_clients
    WHERE flow_type = 'token_exchange' AND user_id = ${userId}
    ORDER BY created_at ASC
  `;

  if (exchangeClients.length > 0) {
    allPortals.push({
      id: "sf-token-exchange-login",
      name: "Token Exchange",
      protocol: "token-exchange",
      description:
        "Exchange your web session for a Salesforce user session using OAuth 2.0 Token Exchange",
      external: false,
      clients: exchangeClients.map((r) => ({ id: r.id, label: r.label })),
    });
  }

  const portals = allPortals.map(({ allowedUserIds: _, ...rest }) => rest);

  res.json({ portals });
});

export default router;
