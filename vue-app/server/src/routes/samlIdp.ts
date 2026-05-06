import { Router, type Request, type Response } from "express";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { randomBytes, randomUUID } from "node:crypto";
import { SignedXml } from "xml-crypto";
import { verifyToken, getCookieName, type AuthUser } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router: import("express").Router = Router();

// ── Config ────────────────────────────────────────────────────────────────────

const IDP_ENTITY_ID =
  process.env.IDP_ENTITY_ID ?? "https://sgummalla-net.fly.dev";
const SP_ACS_URL =
  process.env.SP_ACS_URL ?? "https://support.sgummalla.net/login";
const SP_ENTITY_ID =
  process.env.SP_ENTITY_ID ?? "https://support.sgummalla.net";

function getCertAndKey(): { cert: string; key: string } {
  if (process.env.IDP_CERT && process.env.IDP_PRIVATE_KEY) {
    return { cert: process.env.IDP_CERT, key: process.env.IDP_PRIVATE_KEY };
  }
  const certsDir = resolve(__dirname, "../../certs");
  return {
    cert: readFileSync(resolve(certsDir, "idp.crt"), "utf-8").trim(),
    key: readFileSync(resolve(certsDir, "idp.key"), "utf-8").trim(),
  };
}

function certBody(cert: string): string {
  return cert
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
}

// ── Build + sign SAML assertion ───────────────────────────────────────────────

function buildSignedResponse(opts: {
  requestId: string;
  user: AuthUser;
  cert: string;
  key: string;
}): string {
  const { requestId, user, cert, key } = opts;
  const now = new Date();
  const notBefore = new Date(now.getTime() - 30_000);
  const notAfter = new Date(now.getTime() + 3_600_000);

  const responseId = `_${randomUUID().replace(/-/g, "")}`;
  const assertionId = `_${randomUUID().replace(/-/g, "")}`;

  const firstName = user.name.split(" ")[0] ?? user.name;
  const lastName = user.name.split(" ").slice(1).join(" ") || firstName;

  // Build assertion XML (will be signed)
  const assertion = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" Version="2.0" IssueInstant="${now.toISOString()}">
  <saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">${user.id}</saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData NotOnOrAfter="${notAfter.toISOString()}" Recipient="${SP_ACS_URL}" InResponseTo="${requestId}"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="${notBefore.toISOString()}" NotOnOrAfter="${notAfter.toISOString()}">
    <saml:AudienceRestriction>
      <saml:Audience>${SP_ENTITY_ID}</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="${now.toISOString()}" SessionIndex="${assertionId}">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
  <saml:AttributeStatement>
    <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
      <saml:AttributeValue xsi:type="xs:string" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${user.email}</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
      <saml:AttributeValue xsi:type="xs:string" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${firstName}</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
      <saml:AttributeValue xsi:type="xs:string" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${lastName}</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="username" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
      <saml:AttributeValue xsi:type="xs:string" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${user.email}</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>`;

  // Sign the assertion using xml-crypto v6
  const sig = new SignedXml({
    privateKey: key,
    publicCert: cert,
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
  });
  sig.addReference({
    xpath: `//*[@ID="${assertionId}"]`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
  });
  sig.computeSignature(assertion, {
    location: { reference: '//*[local-name()="Issuer"]', action: "after" },
  });

  const signedAssertion = sig.getSignedXml();

  // Wrap in Response envelope
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${responseId}" Version="2.0" IssueInstant="${now.toISOString()}"
  Destination="${SP_ACS_URL}" InResponseTo="${requestId}">
  <saml:Issuer>${IDP_ENTITY_ID}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  ${signedAssertion}
</samlp:Response>`;

  return Buffer.from(response).toString("base64");
}

// ── GET /api/saml/sso ─────────────────────────────────────────────────────────

router.get("/sso", async (req: Request, res: Response) => {
  const samlRequest = req.query["SAMLRequest"] as string | undefined;
  const relayState = req.query["RelayState"] as string | undefined;

  if (!samlRequest) {
    res.status(400).json({ error: "Missing SAMLRequest parameter" });
    return;
  }

  const token = req.cookies[getCookieName()] as string | undefined;

  if (!token) {
    const params = new URLSearchParams({
      SAMLRequest: samlRequest,
      ...(relayState ? { RelayState: relayState } : {}),
    });
    res.redirect(`/login?${params.toString()}`);
    return;
  }

  try {
    const payload = verifyToken(token);
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
    };

    // Parse request ID
    let requestId = `_${randomBytes(16).toString("hex")}`;
    try {
      const xml = inflateRawSync(Buffer.from(samlRequest, "base64")).toString(
        "utf-8",
      );
      const match = xml.match(/\sID=["']([^"']+)["']/);
      if (match?.[1]) requestId = match[1];
    } catch {
      // requestId stays as random UUID
    }

    const { cert, key } = getCertAndKey();

    logger.samlRequest({
      requestId,
      spEntityId: SP_ENTITY_ID,
      acsUrl: SP_ACS_URL,
      userEmail: user.email,
      userName: user.name,
      idpEntityId: IDP_ENTITY_ID,
    });

    const samlResponse = buildSignedResponse({ requestId, user, cert, key });

    res.send(`<!DOCTYPE html>
<html>
<head><title>SSO</title></head>
<body onload="document.forms[0].submit()">
  <form method="POST" action="${SP_ACS_URL}">
    <input type="hidden" name="SAMLResponse" value="${samlResponse}"/>
    ${relayState ? `<input type="hidden" name="RelayState" value="${relayState}"/>` : ""}
    <noscript><button type="submit">Continue</button></noscript>
  </form>
</body>
</html>`);
  } catch (err) {
    logger.error("SAML SSO", err);
    res.clearCookie(getCookieName());
    const params = new URLSearchParams({
      SAMLRequest: samlRequest,
      ...(relayState ? { RelayState: relayState } : {}),
    });
    res.redirect(`/login?${params.toString()}`);
  }
});

// ── GET /api/saml/idp-metadata ────────────────────────────────────────────────

router.get("/idp-metadata", (_req: Request, res: Response) => {
  try {
    const { cert } = getCertAndKey();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${IDP_ENTITY_ID}">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${certBody(cert)}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${IDP_ENTITY_ID}/api/saml/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;
    res.type("application/xml");
    res.send(xml);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .json({ error: "Failed to generate IDP metadata", detail: msg });
  }
});

export default router;
