<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, AuthCard, Button } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import { getPortals, type Portal } from "../../api/portals";
import {
  getSfFrontdoorUrl,
  type FrontdoorLog,
} from "../../api/salesforceExchange";

const router = useRouter();
const auth = useAuthStore();
const portals = ref<Portal[]>([]);
const launching = ref<string | null>(null);
const openDropdownPortal = ref<string | null>(null);

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}

async function launch(portal: Portal) {
  if (portal.disabled) return;
  if (!portal.external && portal.launchUrl) {
    router.push(portal.launchUrl);
    return;
  }
  launching.value = portal.id;
  try {
    if (portal.launchUrl) {
      window.open(portal.launchUrl, "_blank", "noopener,noreferrer");
    }
  } finally {
    launching.value = null;
  }
}

function toggleDropdown(portalId: string) {
  if (openDropdownPortal.value === portalId) {
    openDropdownPortal.value = null;
    return;
  }
  openDropdownPortal.value = portalId;
  // Close on the next click anywhere — setTimeout 0 skips the current click
  setTimeout(() => {
    const close = () => {
      openDropdownPortal.value = null;
    };
    window.addEventListener("click", close, { once: true });
  }, 0);
}

async function launchForClient(clientId: string) {
  openDropdownPortal.value = null;
  await openLogModal(clientId);
}

onMounted(async () => {
  portals.value = await getPortals();
});

// ── Log modal ─────────────────────────────────────────────────────────────────

interface LogModal {
  open: boolean;
  loading: boolean;
  visibleLines: FrontdoorLog[];
  url: string | null;
  error: string | null;
}

const logModal = ref<LogModal>({
  open: false,
  loading: false,
  visibleLines: [],
  url: null,
  error: null,
});

async function openLogModal(clientId: string) {
  logModal.value = {
    open: true,
    loading: true,
    visibleLines: [],
    url: null,
    error: null,
  };

  try {
    const result = await getSfFrontdoorUrl(clientId);
    logModal.value.loading = false;

    // Stagger log lines for a live-replay effect
    for (let i = 0; i < result.logs.length; i++) {
      await new Promise((r) => setTimeout(r, 130));
      logModal.value.visibleLines = result.logs.slice(0, i + 1);
    }

    logModal.value.url = result.url;
  } catch (err) {
    logModal.value.loading = false;
    logModal.value.error =
      err instanceof Error ? err.message : "Token exchange failed";
  }
}

function closeLogModal() {
  logModal.value.open = false;
}

function openSalesforce() {
  if (logModal.value.url) {
    window.open(logModal.value.url, "_blank", "noopener,noreferrer");
    closeLogModal();
  }
}

function iconFor(status: FrontdoorLog["status"]) {
  if (status === "ok") return "✓";
  if (status === "cached") return "↻";
  return "→";
}
</script>

<template>
  <AppLayout
    active-page="auths"
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    @profile="router.push({ name: 'profile' })"
    :scrollable="true"
    @logout="handleLogout"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div class="vz-auths">
      <div class="vz-auths__section-header">
        <h1 class="vz-auths__title">Integrations</h1>
        <p class="vz-auths__sub">
          Configured authentication integrations and their entry points.
        </p>
      </div>

      <div class="vz-auths__grid">
        <AuthCard
          v-for="portal in portals"
          :key="portal.id"
          :title="portal.name"
          :description="portal.description"
          :protocol="portal.protocol"
          :status="portal.disabled ? 'inactive' : 'active'"
          :class="{ 'vz-auth-card--disabled': portal.disabled }"
        >
          <template #action>
            <!-- Disabled -->
            <span v-if="portal.disabled" class="vz-coming-soon"
              >Coming soon</span
            >

            <!-- Token Exchange: single client → plain button; multiple → dropdown -->
            <div
              v-else-if="portal.protocol === 'token-exchange'"
              class="vz-te-wrap"
            >
              <!-- Single client: just a button -->
              <button
                v-if="(portal.clients?.length ?? 0) <= 1"
                class="vz-te-btn"
                :disabled="logModal.open && logModal.loading"
                @click="launchForClient(portal.clients![0].id)"
              >
                {{ portal.clients![0]?.label ?? "Login" }} ↗
              </button>

              <!-- Multiple clients: dropdown button -->
              <div v-else class="vz-te-dropdown">
                <button
                  class="vz-te-btn vz-te-btn--chevron"
                  :disabled="logModal.open && logModal.loading"
                  @click.stop="toggleDropdown(portal.id)"
                >
                  <span>Login ↗</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div v-if="openDropdownPortal === portal.id" class="vz-te-menu">
                  <div class="vz-te-menu-header">Select organisation</div>
                  <button
                    v-for="c in portal.clients"
                    :key="c.id"
                    class="vz-te-menu-item"
                    @click.stop="launchForClient(c.id)"
                  >
                    <svg
                      class="vz-te-org-icon"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <path d="M9 22V12h6v10" />
                      <path d="M8 7h.01M16 7h.01M12 7h.01" />
                      <path d="M8 11h.01M16 11h.01M12 11h.01" />
                    </svg>
                    {{ c.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Normal launch -->
            <Button
              v-else
              variant="ghost"
              :loading="launching === portal.id"
              @click="launch(portal)"
            >
              {{ portal.name }} ↗
            </Button>
          </template>
        </AuthCard>
      </div>
    </div>
  </AppLayout>

  <!-- Token Exchange log modal -->
  <Teleport to="body">
    <Transition name="sf-fade">
      <div v-if="logModal.open" class="sf-overlay" @click.self="closeLogModal">
        <div class="sf-modal">
          <div class="sf-modal__header">
            <span class="sf-modal__title"
              >Salesforce Login · Token Exchange</span
            >
            <button class="sf-modal__close" @click="closeLogModal">✕</button>
          </div>

          <div class="sf-modal__body">
            <!-- Pending spinner -->
            <div
              v-if="logModal.loading"
              class="sf-log-line sf-log-line--pending"
            >
              <span class="sf-spinner">◌</span>
              <span>Connecting to Salesforce...</span>
            </div>

            <!-- Replayed log entries -->
            <TransitionGroup name="sf-line">
              <div
                v-for="(entry, i) in logModal.visibleLines"
                :key="i"
                class="sf-log-line"
                :class="`sf-log-line--${entry.status}`"
              >
                <span class="sf-log-icon">{{ iconFor(entry.status) }}</span>
                <span>{{ entry.step }}</span>
              </div>
            </TransitionGroup>

            <!-- Error -->
            <div v-if="logModal.error" class="sf-log-line sf-log-line--error">
              <span class="sf-log-icon">✗</span>
              <span>{{ logModal.error }}</span>
            </div>
          </div>

          <div v-if="logModal.url" class="sf-modal__footer">
            <button class="sf-btn-open" @click="openSalesforce">
              Open Salesforce ↗
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./AuthsView.css"></style>
