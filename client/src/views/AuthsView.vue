<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, AuthCard, Button } from "@sgw/ui";
import { useAuthStore } from "../stores/auth";
import { getPortals, type Portal } from "../api/portals";
import {
  getSfFrontdoorUrl,
  type FrontdoorLog,
} from "../api/salesforceExchange";

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

<style scoped>
.vz-auths {
  width: 100%;
  max-width: 720px;
  animation: vz-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  padding-bottom: 2rem;
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

.vz-auths__section-header {
  margin-bottom: 1.5rem;
}

.vz-auths__title {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--vz-text);
  margin-bottom: 0.4rem;
  line-height: 1;
}

.vz-auths__sub {
  font-size: 0.92rem;
  color: var(--vz-text2);
  line-height: 1.6;
}

.vz-auths__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 1rem;
}

.vz-auths__grid :deep(.vz-auth-card) {
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  padding: 1.25rem 1.5rem;
  gap: 0.6rem;
  aspect-ratio: 1 / 1.2;
  overflow: hidden;
}

.vz-auths__grid :deep(.vz-auth-card__title) {
  font-size: 1.05rem;
}

.vz-auths__grid :deep(.vz-auth-card__desc) {
  font-size: 0.9rem;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* Pin action row to a fixed height so all tiles align at the bottom */
.vz-auths__grid :deep(.vz-auth-card__action) {
  margin-top: auto;
  padding-top: 0.75rem;
  min-height: 2.25rem;
  display: flex;
  align-items: center;
}

/* Disabled tiles */
.vz-auths__grid :deep(.vz-auth-card.vz-auth-card--disabled) {
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
}

.vz-coming-soon {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
  display: flex;
  align-items: center;
  height: 2rem; /* matches button height so action rows are visually equal */
}

/* Token Exchange dropdown button */
.vz-te-wrap {
  display: flex;
  align-items: center;
  width: 100%;
}

.vz-te-dropdown {
  position: relative;
  width: 100%;
}

.vz-te-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.32rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: var(--vz-font-sans);
  color: var(--vz-orange);
  background: transparent;
  border: 1px solid var(--vz-orange);
  border-radius: var(--vz-radius-sm);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}
.vz-te-btn:hover:not(:disabled) {
  background: var(--vz-orange);
  color: #fff;
}
.vz-te-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vz-te-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  max-width: 300px;
  background: var(--vz-bg);
  border: 1.5px solid var(--vz-orange);
  border-radius: var(--vz-radius-md);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 16px rgba(247, 99, 0, 0.08);
  z-index: 100;
  overflow: hidden;
}

.vz-te-menu-header {
  padding: 0.45rem 0.85rem 0.3rem;
  font-family: var(--vz-font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vz-orange);
  border-bottom: 1px solid var(--vz-orange-dim);
  margin-bottom: 0.2rem;
}

.vz-te-menu-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vz-text);
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--vz-font-sans);
}
.vz-te-menu-item:hover {
  background: var(--vz-orange);
  color: #fff;
  border-left-color: var(--vz-orange);
}

.vz-te-org-icon {
  flex-shrink: 0;
  color: var(--vz-orange);
  opacity: 0.4;
  transition:
    opacity 0.12s,
    color 0.12s,
    transform 0.12s;
}
.vz-te-menu-item:hover .vz-te-org-icon {
  color: #fff;
  opacity: 1;
  transform: scale(1.1);
}

@media (max-width: 680px) {
  .vz-auths__grid {
    grid-template-columns: 1fr;
  }
}

/* ── Log modal ──────────────────────────────────────────────────────────────── */

.sf-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sf-modal {
  background: #0b1120;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  width: 420px;
  max-width: 94vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  font-family: ui-monospace, "SF Mono", "Fira Code", monospace;
}

.sf-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sf-modal__title {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.sf-modal__close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  transition:
    color 0.15s,
    background 0.15s;
}
.sf-modal__close:hover {
  color: #f76300;
  background: rgba(247, 99, 0, 0.14);
}

.sf-modal__body {
  padding: 1rem;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.sf-log-line {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.55);
}

.sf-log-icon {
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  font-size: 0.75rem;
}

.sf-log-line--ok .sf-log-icon {
  color: #4ade80;
}
.sf-log-line--ok {
  color: rgba(255, 255, 255, 0.75);
}
.sf-log-line--cached .sf-log-icon {
  color: #fbbf24;
}
.sf-log-line--cached {
  color: rgba(255, 255, 255, 0.6);
}
.sf-log-line--info .sf-log-icon {
  color: #60a5fa;
}
.sf-log-line--error .sf-log-icon {
  color: #f87171;
}
.sf-log-line--error {
  color: #f87171;
}
.sf-log-line--pending {
  color: rgba(255, 255, 255, 0.35);
}

.sf-spinner {
  display: inline-block;
  animation: sf-spin 1.2s linear infinite;
  font-size: 0.8rem;
  color: #60a5fa;
}

@keyframes sf-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sf-modal__footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  justify-content: flex-end;
}

.sf-btn-open {
  background: transparent;
  color: var(--vz-orange);
  border: 1px solid var(--vz-orange);
  border-radius: 6px;
  padding: 0.45rem 1.1rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    color 0.15s;
}
.sf-btn-open:hover {
  background: var(--vz-orange);
  color: #fff;
}

/* Modal enter/leave */
.sf-fade-enter-active,
.sf-fade-leave-active {
  transition: opacity 0.2s;
}
.sf-fade-enter-from,
.sf-fade-leave-to {
  opacity: 0;
}

/* Log line enter */
.sf-line-enter-active {
  transition:
    opacity 0.18s,
    transform 0.18s;
}
.sf-line-enter-from {
  opacity: 0;
  transform: translateX(-6px);
}
</style>
