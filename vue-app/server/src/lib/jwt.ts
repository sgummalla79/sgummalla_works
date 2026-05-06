import jwt, { type SignOptions } from "jsonwebtoken";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SfAccount {
  client_id: string;
  sf_username: string;
  label?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  provider: "credentials" | "auth0" | "saml" | "oidc";
  sfAccounts?: SfAccount[];
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: JwtPayload["provider"];
  sfAccounts?: SfAccount[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

export function getCookieName(): string {
  return process.env.JWT_COOKIE_NAME ?? "sgw_token";
}

// ── Sign ──────────────────────────────────────────────────────────────────────

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    ...(user.sfAccounts?.length ? { sfAccounts: user.sfAccounts } : {}),
  };

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as string &
      SignOptions["expiresIn"],
    algorithm: "HS256",
  };

  return jwt.sign(payload, getSecret(), options);
}

// ── Verify ────────────────────────────────────────────────────────────────────

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  return decoded as JwtPayload;
}

// ── Pending link (account linking flow) ──────────────────────────────────────

export interface PendingLinkPayload {
  primaryUserId: string;
  primaryProvider: string;
  secondaryUserId: string;
  secondaryProvider: string;
  email: string;
}

export function getPendingLinkCookieName(): string {
  return "sgw_pending_link";
}

export function signPendingLink(data: PendingLinkPayload): string {
  return jwt.sign(data, getSecret(), { expiresIn: "10m", algorithm: "HS256" });
}

export function verifyPendingLink(token: string): PendingLinkPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  if (typeof decoded === "string") throw new Error("Invalid token payload");
  return decoded as PendingLinkPayload;
}

// ── Cookie options ────────────────────────────────────────────────────────────

export function cookieOptions(maxAgeMs: number = 60 * 60 * 1000) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAgeMs,
    path: "/",
  };
}
