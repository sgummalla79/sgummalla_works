import { ref, computed } from "vue";
import { fetchIdToken } from "../api/auth";

const CLAIM_LABELS: Record<string, string> = {
  sub: "Subject",
  name: "Name",
  given_name: "Given Name",
  family_name: "Family Name",
  nickname: "Nickname",
  email: "Email",
  email_verified: "Email Verified",
  picture: "Picture URL",
  iss: "Issuer",
  aud: "Audience",
  iat: "Issued At",
  exp: "Expires At",
  nonce: "Nonce",
  at_hash: "Access Token Hash",
  sid: "Session ID",
};

const TIMESTAMP_CLAIMS = new Set([
  "iat",
  "exp",
  "nbf",
  "auth_time",
  "updated_at",
]);

export function useProfile() {
  const rawToken = ref<string | null>(null);

  const claims = computed<Record<string, unknown> | null>(() => {
    if (!rawToken.value) return null;
    try {
      const payload = rawToken.value.split(".")[1];
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  });

  const expandedClaims = ref<Set<string>>(new Set());

  function toggleClaim(key: string) {
    const next = new Set(expandedClaims.value);
    next.has(key) ? next.delete(key) : next.add(key);
    expandedClaims.value = next;
  }

  function formatClaimValue(key: string, value: unknown): string {
    if (TIMESTAMP_CLAIMS.has(key) && typeof value === "number") {
      return new Date(value * 1000).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (Array.isArray(value))
      return value
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join(", ");
    if (typeof value === "object" && value !== null)
      return JSON.stringify(value);
    return String(value);
  }

  function claimType(
    key: string,
    value: unknown,
  ): "bool" | "timestamp" | "url" | "array-obj" | "default" {
    if (typeof value === "boolean") return "bool";
    if (TIMESTAMP_CLAIMS.has(key)) return "timestamp";
    if (
      key === "picture" &&
      typeof value === "string" &&
      value.startsWith("http")
    )
      return "url";
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === "object" &&
      value[0] !== null
    )
      return "array-obj";
    return "default";
  }

  const orderedClaims = computed(() => {
    if (!claims.value) return [];
    const priority = [
      "sub",
      "name",
      "given_name",
      "family_name",
      "nickname",
      "email",
      "email_verified",
      "picture",
    ];
    const entries = Object.entries(claims.value);
    return [
      ...priority
        .filter((k) => k in claims.value!)
        .map((k) => [k, claims.value![k]] as [string, unknown]),
      ...entries.filter(([k]) => !priority.includes(k)),
    ];
  });

  async function loadToken() {
    rawToken.value = await fetchIdToken();
  }

  return {
    rawToken,
    claims,
    expandedClaims,
    orderedClaims,
    toggleClaim,
    formatClaimValue,
    claimType,
    loadToken,
    CLAIM_LABELS,
  };
}
