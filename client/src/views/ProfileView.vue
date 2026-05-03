<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../stores/auth";
import { fetchIdToken } from "../api/auth";

const router = useRouter();
const auth = useAuthStore();

const user = auth.user;
const joinedDate = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const initials = (user?.name ?? "")
  .split(" ")
  .map((w) => w[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

// ── ID Token ──────────────────────────────────────────────────────────────────

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
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
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

const expandedClaims = ref<Set<string>>(new Set());
function toggleClaim(key: string) {
  const next = new Set(expandedClaims.value);
  next.has(key) ? next.delete(key) : next.add(key);
  expandedClaims.value = next;
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
  const sorted = [
    ...priority
      .filter((k) => k in claims.value!)
      .map((k) => [k, claims.value![k]] as [string, unknown]),
    ...entries.filter(([k]) => !priority.includes(k)),
  ];
  return sorted;
});

onMounted(async () => {
  rawToken.value = await fetchIdToken();
});

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}
</script>

<template>
  <AppLayout
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    :scrollable="true"
    @logout="handleLogout"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div class="vz-profile">
      <!-- ── Identity header ────────────────────────────────────────── -->
      <div class="vz-profile__header">
        <div class="vz-profile__avatar">{{ initials }}</div>
        <div class="vz-profile__identity">
          <h1 class="vz-profile__name">{{ user?.name }}</h1>
          <p class="vz-profile__email">{{ user?.email }}</p>
          <span class="vz-profile__provider">via {{ user?.provider }}</span>
        </div>
      </div>

      <!-- ── Session grid ───────────────────────────────────────────── -->
      <div class="vz-profile__grid">
        <div class="vz-profile__card">
          <p class="vz-profile__card-label">Full Name</p>
          <p class="vz-profile__card-value">{{ user?.name || "—" }}</p>
        </div>
        <div class="vz-profile__card">
          <p class="vz-profile__card-label">Email Address</p>
          <p class="vz-profile__card-value">{{ user?.email || "—" }}</p>
        </div>
        <div class="vz-profile__card">
          <p class="vz-profile__card-label">User ID</p>
          <p class="vz-profile__card-value vz-profile__card-value--mono">
            {{ user?.id || "—" }}
          </p>
        </div>
        <div class="vz-profile__card">
          <p class="vz-profile__card-label">Auth Provider</p>
          <p class="vz-profile__card-value">
            <span class="vz-profile__badge">{{ user?.provider }}</span>
          </p>
        </div>
        <div class="vz-profile__card">
          <p class="vz-profile__card-label">Session Status</p>
          <p class="vz-profile__card-value vz-profile__card-value--green">
            <span class="vz-profile__dot" /> Active
          </p>
        </div>
        <div class="vz-profile__card">
          <p class="vz-profile__card-label">Session Date</p>
          <p class="vz-profile__card-value">{{ joinedDate }}</p>
        </div>
      </div>

      <!-- ── ID Token ───────────────────────────────────────────────── -->
      <div v-if="rawToken" class="vz-token">
        <!-- Decoded claims -->
        <div v-if="orderedClaims.length" class="vz-token__claims">
          <p class="vz-token__claims-title">Decoded Claims</p>
          <div class="vz-token__claims-list">
            <template v-for="[key, value] in orderedClaims" :key="key">
              <!-- Claim row -->
              <div
                class="vz-token__claim"
                :class="{
                  'vz-token__claim--expandable':
                    claimType(key, value) === 'array-obj',
                  'vz-token__claim--open':
                    claimType(key, value) === 'array-obj' &&
                    expandedClaims.has(key),
                }"
                @click="
                  claimType(key, value) === 'array-obj' && toggleClaim(key)
                "
              >
                <span class="vz-token__claim-key">{{
                  CLAIM_LABELS[key] ?? key
                }}</span>

                <span
                  v-if="claimType(key, value) === 'bool'"
                  :class="[
                    'vz-token__claim-badge',
                    value
                      ? 'vz-token__claim-badge--green'
                      : 'vz-token__claim-badge--red',
                  ]"
                  >{{ value ? "Yes" : "No" }}</span
                >

                <span
                  v-else-if="claimType(key, value) === 'url'"
                  class="vz-token__claim-url"
                >
                  {{ formatClaimValue(key, value) }}
                </span>

                <div
                  v-else-if="claimType(key, value) === 'array-obj'"
                  class="vz-token__claim-expandable-value"
                >
                  <span class="vz-token__claim-value">
                    {{ (value as unknown[]).length }} salesforce client(s)
                  </span>
                  <svg
                    class="vz-token__chevron"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    :style="{
                      transform: expandedClaims.has(key)
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    }"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <span
                  v-else
                  :class="[
                    'vz-token__claim-value',
                    claimType(key, value) === 'timestamp'
                      ? 'vz-token__claim-value--ts'
                      : '',
                  ]"
                  >{{ formatClaimValue(key, value) }}</span
                >
              </div>

              <!-- Expanded table for array-of-objects -->
              <div
                v-if="
                  claimType(key, value) === 'array-obj' &&
                  expandedClaims.has(key)
                "
                class="vz-token__subtable-wrap"
              >
                <table class="vz-token__subtable">
                  <thead>
                    <tr>
                      <th>App Developer Name</th>
                      <th>Org URL</th>
                      <th>User Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in value as Record<string, unknown>[]"
                      :key="idx"
                    >
                      <td>{{ item["appDeveloperName"] ?? "—" }}</td>
                      <td>{{ item["orgUrl"] ?? "—" }}</td>
                      <td>{{ item["sf_username"] ?? "—" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.vz-profile {
  width: 100%;
  max-width: 760px;
  animation: vz-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes vz-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Header ─────────────────────────────────────────────────── */

.vz-profile__header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--vz-border);
}

.vz-profile__avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vz-font-mono);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vz-text);
  flex-shrink: 0;
}

.vz-profile__name {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--vz-text);
  line-height: 1;
}

.vz-profile__email {
  font-family: var(--vz-font-mono);
  font-size: 0.82rem;
  color: var(--vz-text2);
}

.vz-profile__provider {
  font-family: var(--vz-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

/* ── Session grid ───────────────────────────────────────────── */

.vz-profile__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--vz-border);
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-lg);
  overflow: hidden;
  margin-bottom: 2.5rem;
}

.vz-profile__card {
  background: var(--vz-bg);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: background 0.15s;
}

.vz-profile__card:hover {
  background: var(--vz-surface);
}

.vz-profile__card-label {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.vz-profile__card-value {
  font-size: 0.95rem;
  color: var(--vz-text);
  font-weight: 500;
}

.vz-profile__card-value--mono {
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  word-break: break-all;
}

.vz-profile__card-value--green {
  color: var(--vz-green);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.vz-profile__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vz-green);
  animation: vz-pulse 2.5s ease-in-out infinite;
}

@keyframes vz-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.vz-profile__badge {
  display: inline-block;
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: var(--vz-radius-sm);
  background: var(--vz-surface2);
  color: var(--vz-text2);
  border: 1px solid var(--vz-border2);
}

/* ── ID Token ───────────────────────────────────────────────── */

.vz-token {
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-lg);
  overflow: hidden;
}

.vz-token__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--vz-border);
  background: var(--vz-surface);
}

.vz-token__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vz-text);
}

.vz-token__subtitle {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--vz-text3);
  margin-top: 0.2rem;
}

.vz-token__claims {
  background: var(--vz-bg);
}

.vz-token__claims-title {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
  padding: 1rem 1.5rem 0.6rem;
  border-bottom: 1px solid var(--vz-border);
}

.vz-token__claims-list {
  display: flex;
  flex-direction: column;
}

.vz-token__claim {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: baseline;
  gap: 1rem;
  padding: 0.65rem 1.5rem;
  border-bottom: 1px solid var(--vz-border);
  transition: background 0.12s;
}

.vz-token__claim:last-child {
  border-bottom: none;
}
.vz-token__claim:hover {
  background: var(--vz-surface);
}

.vz-token__claim-key {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--vz-text3);
  flex-shrink: 0;
}

.vz-token__claim-value {
  font-size: 0.85rem;
  color: var(--vz-text);
  word-break: break-all;
}

.vz-token__claim-value--ts {
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  color: var(--vz-text2);
}

.vz-token__claim-url {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  color: var(--vz-text2);
  word-break: break-all;
}

.vz-token__claim-badge {
  display: inline-block;
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: var(--vz-radius-sm);
}

.vz-token__claim-badge--green {
  background: rgba(74, 222, 128, 0.12);
  color: var(--vz-green);
}

.vz-token__claim-badge--red {
  background: rgba(248, 113, 113, 0.12);
  color: var(--vz-red);
}

.vz-token__claim--expandable {
  cursor: pointer;
  user-select: none;
}

.vz-token__claim--expandable:hover {
  background: var(--vz-orange-dim);
}

.vz-token__claim--open {
  background: var(--vz-surface);
  border-bottom-color: transparent;
}

.vz-token__claim-expandable-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.vz-token__chevron {
  flex-shrink: 0;
  color: var(--vz-text3);
  transition: transform 0.2s;
}

.vz-token__subtable-wrap {
  padding: 0.75rem 1.5rem;
  background: var(--vz-surface);
  border-bottom: 1px solid var(--vz-border);
  overflow-x: auto;
}

.vz-token__subtable {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--vz-font-mono);
  font-size: 0.75rem;
}

.vz-token__subtable thead tr {
  border-bottom: 1px solid var(--vz-border2);
}

.vz-token__subtable th {
  text-align: left;
  padding: 0.4rem 0.75rem;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
  font-weight: 600;
  white-space: nowrap;
}

.vz-token__subtable td {
  padding: 0.5rem 0.75rem;
  color: var(--vz-text);
  border-bottom: 1px solid var(--vz-border);
  word-break: break-all;
}

.vz-token__subtable tbody tr:last-child td {
  border-bottom: none;
}

.vz-token__subtable tbody tr:hover td {
  background: var(--vz-bg);
}

/* ── Responsive ─────────────────────────────────────────────── */

@media (max-width: 600px) {
  .vz-profile__grid {
    grid-template-columns: 1fr;
  }
  .vz-profile__header {
    flex-direction: column;
    align-items: flex-start;
  }
  .vz-token__claim {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
}
</style>
