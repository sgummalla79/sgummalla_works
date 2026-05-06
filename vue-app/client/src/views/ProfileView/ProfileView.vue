<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import { useProfile } from "../../composables/useProfile";

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
  .map((w: string) => w[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

const {
  rawToken,
  expandedClaims,
  orderedClaims,
  toggleClaim,
  formatClaimValue,
  claimType,
  loadToken,
  CLAIM_LABELS,
} = useProfile();

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}

onMounted(loadToken);
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

<style scoped src="./ProfileView.css"></style>
