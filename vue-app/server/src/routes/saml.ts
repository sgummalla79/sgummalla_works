import { Router } from "express";
import passport from "passport";
import {
  Strategy as SamlStrategy,
  type Profile,
  type VerifyWithoutRequest,
} from "passport-saml";
import {
  signToken,
  cookieOptions,
  getCookieName,
  type AuthUser,
} from "../lib/jwt.js";

const router: import("express").Router = Router();

let samlStrategy: SamlStrategy | null = null;

function isSamlConfigured(): boolean {
  return !!(process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER);
}

function buildVerify(): VerifyWithoutRequest {
  return (
    profile: Profile | null | undefined,
    done: (
      err: Error | null,
      user?: Record<string, unknown>,
      info?: Record<string, unknown>,
    ) => void,
  ) => {
    if (!profile) {
      done(new Error("No SAML profile returned"));
      return;
    }

    const user: AuthUser = {
      id: (profile.nameID as string) ?? "",
      email: (profile.email as string) ?? "",
      name:
        `${(profile.firstName as string) ?? ""} ${(profile.lastName as string) ?? ""}`.trim() ||
        ((profile.email as string) ?? ""),
      provider: "saml",
    };

    done(null, user as unknown as Record<string, unknown>);
  };
}

function ensureStrategy(): SamlStrategy {
  if (samlStrategy) return samlStrategy;

  samlStrategy = new SamlStrategy(
    {
      callbackUrl:
        process.env.SAML_CALLBACK_URL ??
        "http://localhost:3000/api/saml/callback",
      entryPoint: process.env.SAML_ENTRY_POINT ?? "",
      issuer: process.env.SAML_ISSUER ?? "",
      cert: process.env.SAML_CERT ?? "",
      wantAssertionsSigned: true,
    },
    buildVerify(),
  );

  passport.use("saml", samlStrategy as unknown as passport.Strategy);
  return samlStrategy;
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

router.use(passport.initialize());

// ── GET /api/saml/initiate ────────────────────────────────────────────────────

router.get("/initiate", (req, res, next) => {
  if (!isSamlConfigured()) {
    res.status(503).json({ error: "SAML is not configured on this server" });
    return;
  }
  ensureStrategy();
  passport.authenticate("saml", { session: false })(req, res, next);
});

// ── POST /api/saml/callback ───────────────────────────────────────────────────

router.post("/callback", (req, res, next) => {
  if (!isSamlConfigured()) {
    res.redirect("/login?error=saml_not_configured");
    return;
  }
  ensureStrategy();

  passport.authenticate(
    "saml",
    { session: false },
    (err: Error | null, user?: Record<string, unknown>) => {
      if (err || !user) {
        res.redirect("/login?error=saml_failed");
        return;
      }

      const token = signToken(user as unknown as AuthUser);
      res.cookie(getCookieName(), token, cookieOptions());
      res.redirect("/auths");
    },
  )(req, res, next);
});

// ── GET /api/saml/metadata ────────────────────────────────────────────────────

router.get("/metadata", (_req, res) => {
  if (!isSamlConfigured()) {
    res.status(503).json({ error: "SAML is not configured on this server" });
    return;
  }
  try {
    const strategy = ensureStrategy();
    res.type("application/xml");
    res.send(
      strategy.generateServiceProviderMetadata(
        null,
        process.env.SAML_CERT ?? null,
      ),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to generate SAML metadata" });
  }
});

export default router;
