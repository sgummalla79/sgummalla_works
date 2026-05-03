<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, TextInput, Button } from "@sgw/ui";
import { useAuthStore } from "../stores/auth";
import DiagramModal from "../components/DiagramModal.vue";
import JwtBearerDiagram from "../components/JwtBearerDiagram.vue";
import SfSetupModal from "../components/SfSetupModal.vue";

const diagramOpen = ref(false);
const setupOpen = ref(false);
import {
  getSfClients,
  getClientTokens,
  createSfClient,
  updateSfClient,
  deleteSfClient,
  deleteCachedToken,
  getSfToken,
  refreshSfToken,
  runSoqlQuery,
  type SfClient,
  type SfUserToken,
  type SoqlResult,
} from "../api/salesforce";

const router = useRouter();
const auth = useAuthStore();

// ── Flyout ────────────────────────────────────────────────────────────────────

const flyoutOpen = ref(false);
const flyoutMode = ref<"register" | "edit">("register");
const flyoutTarget = ref<SfClient | null>(null);
const flyoutForm = ref({
  label: "",
  client_id: "",
  login_url: "https://login.salesforce.com",
  private_key: "",
});
const flyoutError = ref("");
const flyoutSaving = ref(false);

function openRegisterFlyout() {
  flyoutMode.value = "register";
  flyoutTarget.value = null;
  flyoutForm.value = {
    label: "",
    client_id: "",
    login_url: "https://login.salesforce.com",
    private_key: "",
  };
  flyoutError.value = "";
  flyoutOpen.value = true;
}

function openEditFlyout(c: SfClient) {
  flyoutMode.value = "edit";
  flyoutTarget.value = c;
  flyoutForm.value = {
    label: c.label,
    client_id: c.client_id,
    login_url: c.login_url,
    private_key: "",
  };
  flyoutError.value = "";
  flyoutOpen.value = true;
}

function closeFlyout() {
  flyoutOpen.value = false;
}

async function handleFlyoutSubmit() {
  flyoutError.value = "";
  const { label, client_id, login_url, private_key } = flyoutForm.value;

  if (flyoutMode.value === "register") {
    if (!label || !client_id || !private_key) {
      flyoutError.value = "Label, Consumer Key, and Private Key are required";
      return;
    }
    flyoutSaving.value = true;
    try {
      const created = await createSfClient({
        label,
        client_id,
        login_url,
        private_key,
      });
      clients.value.unshift(created);
      flyoutOpen.value = false;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      flyoutError.value = e?.response?.data?.error ?? "Failed to register";
    } finally {
      flyoutSaving.value = false;
    }
  } else {
    if (!flyoutTarget.value) return;
    flyoutSaving.value = true;
    try {
      const updated = await updateSfClient(flyoutTarget.value.id, {
        label,
        client_id,
        login_url,
        ...(private_key ? { private_key } : {}),
      });
      const idx = clients.value.findIndex((x) => x.id === updated.id);
      if (idx !== -1) clients.value[idx] = updated;
      delete userTokens.value[updated.id];
      flyoutOpen.value = false;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      flyoutError.value = e?.response?.data?.error ?? "Failed to save";
    } finally {
      flyoutSaving.value = false;
    }
  }
}

// ── Clients list ──────────────────────────────────────────────────────────────

const clients = ref<SfClient[]>([]);
const loadError = ref("");
const expandedId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

async function loadClients() {
  try {
    clients.value = await getSfClients();
  } catch {
    loadError.value = "Failed to load clients";
  }
}

async function handleDelete(c: SfClient) {
  deletingId.value = c.id;
  try {
    await deleteSfClient(c.id);
    clients.value = clients.value.filter((x) => x.id !== c.id);
    if (expandedId.value === c.id) expandedId.value = null;
    delete userTokens.value[c.id];
    delete newUsernameInputs.value[c.id];
  } finally {
    deletingId.value = null;
  }
}

// ── User tokens per client ────────────────────────────────────────────────────

// Map of clientId → list of user token rows
const userTokens = ref<
  Record<string, (SfUserToken & { refreshing?: boolean; deleting?: boolean })[]>
>({});
const tokensLoading = ref<Record<string, boolean>>({});
const newUsernameInputs = ref<Record<string, string>>({});
const gettingToken = ref<Record<string, boolean>>({});
const getTokenErrors = ref<Record<string, string>>({});

async function toggleExpand(c: SfClient) {
  if (expandedId.value === c.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = c.id;
  if (!userTokens.value[c.id]) {
    await loadUserTokens(c.id);
  }
}

async function loadUserTokens(clientId: string) {
  tokensLoading.value[clientId] = true;
  try {
    userTokens.value[clientId] = await getClientTokens(clientId);
  } finally {
    tokensLoading.value[clientId] = false;
  }
}

async function handleGetToken(c: SfClient) {
  const sf_username = newUsernameInputs.value[c.id]?.trim();
  if (!sf_username) return;
  getTokenErrors.value[c.id] = "";
  gettingToken.value[c.id] = true;
  try {
    await getSfToken(c.id, sf_username);
    await loadUserTokens(c.id);
    newUsernameInputs.value[c.id] = "";
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    getTokenErrors.value[c.id] =
      e?.response?.data?.error ?? "Token exchange failed";
  } finally {
    gettingToken.value[c.id] = false;
  }
}

async function handleRefreshToken(
  clientId: string,
  row: SfUserToken & { refreshing?: boolean },
) {
  row.refreshing = true;
  try {
    await refreshSfToken(clientId, row.sf_username);
    const fresh = await getClientTokens(clientId);
    userTokens.value[clientId] = fresh;
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    console.error("Refresh failed:", e?.response?.data?.error);
  } finally {
    row.refreshing = false;
  }
}

async function handleDeleteToken(
  clientId: string,
  row: SfUserToken & { deleting?: boolean },
) {
  row.deleting = true;
  try {
    await deleteCachedToken(clientId, row.sf_username);
    userTokens.value[clientId] = userTokens.value[clientId].filter(
      (t) => t.sf_username !== row.sf_username,
    );
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    console.error("Delete token failed:", e?.response?.data?.error);
    row.deleting = false;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isExpired(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 90 * 60 * 1000;
}

// ── CLI panel ─────────────────────────────────────────────────────────────────

const cliOpen = ref(false);
const cliClient = ref<SfClient | null>(null);
const cliUsername = ref("");
const cliSoql = ref("SELECT Id, Name FROM Account LIMIT 10");
const cliRunning = ref(false);
const cliResult = ref<SoqlResult | null>(null);
const cliError = ref("");

const cliColumns = computed(() => {
  if (!cliResult.value?.records.length) return [];
  return Object.keys(cliResult.value.records[0]).filter(
    (k) => k !== "attributes",
  );
});

function openCli(c: SfClient, username: string) {
  cliClient.value = c;
  cliUsername.value = username;
  cliResult.value = null;
  cliError.value = "";
  cliOpen.value = true;
}

function closeCli() {
  cliOpen.value = false;
}

async function runQuery() {
  if (!cliClient.value || !cliSoql.value.trim() || !cliUsername.value) return;
  cliRunning.value = true;
  cliResult.value = null;
  cliError.value = "";
  try {
    cliResult.value = await runSoqlQuery(
      cliClient.value.id,
      cliUsername.value,
      cliSoql.value.trim(),
    );
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    cliError.value = e?.response?.data?.error ?? "Query failed";
  } finally {
    cliRunning.value = false;
  }
}

function cellValue(row: Record<string, unknown>, col: string): string {
  const v = row[col];
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}

onMounted(loadClients);
</script>

<template>
  <AppLayout
    active-page="salesforce"
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    @profile="router.push({ name: 'profile' })"
    :scrollable="true"
    @logout="handleLogout"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div class="sf-page">
      <!-- Header -->
      <div class="sf-page__header">
        <div>
          <p class="sf-page__eyebrow">Salesforce</p>
          <div class="sf-page__title-row">
            <h1 class="sf-page__title">JWT Bearer Authentication</h1>
            <button
              class="sf-diagram-btn"
              title="View sequence diagram"
              @click="diagramOpen = true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="5" height="5" rx="1" />
                <rect x="16" y="3" width="5" height="5" rx="1" />
                <rect x="3" y="16" width="5" height="5" rx="1" />
                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                <path d="M21 21v.01" />
                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                <path d="M3 12h.01" />
              </svg>
            </button>
            <button
              class="sf-diagram-btn"
              title="Salesforce setup guide"
              @click="setupOpen = true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                style="color: #00a1e0"
              >
                <path
                  d="M10.12 3.27a5.1 5.1 0 0 1 3.61 1.5 6.12 6.12 0 0 1 3.74-1.27 6.18 6.18 0 0 1 6.18 6.18 6.18 6.18 0 0 1-6.18 6.18H5.25A4.25 4.25 0 0 1 1 11.62a4.25 4.25 0 0 1 4.25-4.25c.17 0 .34.01.5.03A5.09 5.09 0 0 1 10.12 3.27z"
                />
              </svg>
            </button>
          </div>
          <p class="sf-page__sub">
            Register a Connected App once, then issue session tokens for any
            user via the JWT Bearer flow.
          </p>
        </div>
        <Button variant="primary" @click="openRegisterFlyout">+ Register</Button>
      </div>

      <p v-if="loadError" class="sf-msg sf-msg--err">{{ loadError }}</p>
      <p v-else-if="clients.length === 0" class="sf-msg">
        No clients registered yet. Click <strong>+ Register</strong> to add one.
      </p>

      <!-- Clients table -->
      <div v-else class="sf-clients-wrap">
        <table class="sf-clients">
          <thead>
            <tr>
              <th>Label</th>
              <th>Consumer Key</th>
              <th>Login URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="c in clients" :key="c.id">
              <!-- Client row -->
              <tr
                class="sf-client-row"
                :class="{ 'sf-client-row--open': expandedId === c.id }"
                @click="toggleExpand(c)"
              >
                <td class="sf-td sf-td--name">{{ c.label }}</td>
                <td class="sf-td sf-td--mono">
                  {{ c.client_id.slice(0, 22) }}…
                </td>
                <td class="sf-td sf-td--url">{{ c.login_url }}</td>
                <td class="sf-td sf-td--controls" @click.stop>
                  <div class="sf-row-btns">
                    <button
                      class="sf-icon-btn"
                      title="Edit"
                      @click="openEditFlyout(c)"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        />
                        <path
                          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                        />
                      </svg>
                    </button>
                    <button
                      class="sf-icon-btn sf-icon-btn--danger"
                      title="Delete"
                      :disabled="deletingId === c.id"
                      @click="handleDelete(c)"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path
                          d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                        />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                    <svg
                      class="sf-chevron"
                      :class="{ 'sf-chevron--open': expandedId === c.id }"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </td>
              </tr>

              <!-- Expanded: user tokens -->
              <tr v-if="expandedId === c.id" class="sf-expand-row">
                <td colspan="4" class="sf-expand-cell">
                  <div class="sf-expand">
                    <!-- Loading -->
                    <p v-if="tokensLoading[c.id]" class="sf-msg">Loading…</p>

                    <template v-else>
                      <!-- User tokens table -->
                      <div
                        v-if="userTokens[c.id]?.length"
                        class="sf-users-wrap"
                      >
                        <table class="sf-users">
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Instance</th>
                              <th>Issued</th>
                              <th>Status</th>
                              <th class="sf-th--center">Refresh Token</th>
                              <th class="sf-th--center">CLI</th>
                              <th class="sf-th--center">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="row in userTokens[c.id]"
                              :key="row.sf_username"
                              class="sf-user-row"
                            >
                              <td class="sf-utd sf-utd--user">
                                {{ row.sf_username }}
                              </td>
                              <td class="sf-utd sf-utd--instance">
                                {{ row.instance_url }}
                              </td>
                              <td class="sf-utd sf-utd--time">
                                {{ relativeTime(row.issued_at) }}
                              </td>
                              <td class="sf-utd">
                                <span
                                  class="sf-status"
                                  :class="
                                    isExpired(row.issued_at)
                                      ? 'sf-status--expired'
                                      : 'sf-status--active'
                                  "
                                >
                                  {{
                                    isExpired(row.issued_at)
                                      ? "expired"
                                      : "active"
                                  }}
                                </span>
                              </td>
                              <td class="sf-utd sf-utd--action">
                                <Button
                                  variant="primary"
                                  :loading="!!row.refreshing"
                                  @click="handleRefreshToken(c.id, row)"
                                >
                                  Refresh
                                </Button>
                              </td>
                              <td class="sf-utd sf-utd--action">
                                <button
                                  class="sf-icon-btn"
                                  title="SOQL Query"
                                  @click="openCli(c, row.sf_username)"
                                >
                                  <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.75"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <polyline points="4 17 10 11 4 5" />
                                    <line x1="12" y1="19" x2="20" y2="19" />
                                  </svg>
                                </button>
                              </td>
                              <td class="sf-utd sf-utd--action">
                                <button
                                  class="sf-icon-btn sf-icon-btn--danger"
                                  title="Delete cached token"
                                  :disabled="!!row.deleting"
                                  @click="handleDeleteToken(c.id, row)"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.75"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p v-else class="sf-msg">
                        No tokens issued yet for this client.
                      </p>

                      <!-- Get token for a new user -->
                      <div class="sf-new-user">
                        <span class="sf-new-user__label"
                          >Get token for user</span
                        >
                        <input
                          v-model="newUsernameInputs[c.id]"
                          class="sf-username-input"
                          type="email"
                          placeholder="user@myorg.salesforce.com"
                          autocomplete="off"
                          @keydown.enter="handleGetToken(c)"
                        />
                        <Button
                          variant="primary"
                          :loading="gettingToken[c.id]"
                          :disabled="!newUsernameInputs[c.id]?.trim()"
                          @click="handleGetToken(c)"
                        >
                          Get Token
                        </Button>
                        <span
                          v-if="getTokenErrors[c.id]"
                          class="sf-msg sf-msg--err"
                        >
                          {{ getTokenErrors[c.id] }}
                        </span>
                      </div>
                    </template>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>

  <!-- ── Flyout ── -->
  <Teleport to="body">
    <Transition name="sf-fade">
      <div v-if="flyoutOpen" class="sf-overlay" @click="closeFlyout" />
    </Transition>
    <div class="sf-flyout" :class="{ 'sf-flyout--open': flyoutOpen }">
      <div class="sf-flyout__head">
        <span class="sf-flyout__title">
          {{
            flyoutMode === "register"
              ? "Register Connected App"
              : "Edit Connected App"
          }}
        </span>
        <button class="sf-icon-btn" @click="closeFlyout">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="sf-flyout__body">
        <TextInput
          v-model="flyoutForm.label"
          label="Label"
          placeholder="e.g. Production Org"
          autocomplete="off"
        />
        <TextInput
          v-model="flyoutForm.client_id"
          label="Consumer Key (Client ID)"
          placeholder="3MVG9..."
          autocomplete="off"
        />
        <TextInput
          v-model="flyoutForm.login_url"
          label="Login URL"
          placeholder="https://login.salesforce.com"
          autocomplete="off"
        />
        <div class="sf-field">
          <label class="sf-field__label">
            RSA Private Key (PEM){{
              flyoutMode === "edit" ? " — leave blank to keep existing" : ""
            }}
          </label>
          <textarea
            v-model="flyoutForm.private_key"
            class="sf-field__textarea"
            placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
            rows="7"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
        <div class="sf-flyout__footer">
          <Button
            variant="primary"
            :loading="flyoutSaving"
            @click="handleFlyoutSubmit"
          >
            {{ flyoutMode === "register" ? "Register" : "Save Changes" }}
          </Button>
          <Button variant="ghost" @click="closeFlyout">Cancel</Button>
          <span v-if="flyoutError" class="sf-msg sf-msg--err">{{
            flyoutError
          }}</span>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── CLI panel ── -->
  <Teleport to="body">
    <div class="sf-cli" :class="{ 'sf-cli--open': cliOpen }">
      <div class="sf-cli__head">
        <div class="sf-cli__head-left">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span class="sf-cli__label">SOQL</span>
          <span v-if="cliClient" class="sf-cli__context">{{
            cliClient.label
          }}</span>
          <span v-if="cliUsername" class="sf-cli__user"
            >· {{ cliUsername }}</span
          >
        </div>
        <button class="sf-cli__close" @click="closeCli">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="sf-cli__editor">
        <textarea
          v-model="cliSoql"
          class="sf-cli__input"
          spellcheck="false"
          autocomplete="off"
          @keydown.ctrl.enter.prevent="runQuery"
          @keydown.meta.enter.prevent="runQuery"
        />
        <div class="sf-cli__run-col">
          <Button
            variant="primary"
            :loading="cliRunning"
            :disabled="!cliSoql.trim()"
            @click="runQuery"
          >
            Run
          </Button>
          <span class="sf-cli__hint">⌘↵</span>
        </div>
      </div>

      <div class="sf-cli__output">
        <div v-if="cliError" class="sf-cli__error">✕ {{ cliError }}</div>
        <div
          v-else-if="cliResult && cliResult.records.length === 0"
          class="sf-cli__dim"
        >
          No records returned &nbsp;·&nbsp; totalSize: {{ cliResult.totalSize }}
        </div>
        <template v-else-if="cliResult">
          <div class="sf-cli__meta">
            {{ cliResult.totalSize }} record{{
              cliResult.totalSize !== 1 ? "s" : ""
            }}
            <span v-if="!cliResult.done" class="sf-cli__dim"
              >&nbsp;· more available</span
            >
          </div>
          <div class="sf-cli__table-wrap">
            <table class="sf-cli__table">
              <thead>
                <tr>
                  <th v-for="col in cliColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in cliResult.records" :key="i">
                  <td v-for="col in cliColumns" :key="col">
                    {{ cellValue(row, col) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="sf-cli__dim">Enter a SOQL query and click Run</div>
      </div>
    </div>
  </Teleport>

  <!-- Sequence diagram modal -->
  <DiagramModal
    :open="diagramOpen"
    title="JWT Bearer Authentication — Sequence Diagram"
    @close="diagramOpen = false"
  >
    <JwtBearerDiagram />
  </DiagramModal>

  <!-- Salesforce setup guide modal -->
  <SfSetupModal
    :open="setupOpen"
    flow="jwt-bearer"
    @close="setupOpen = false"
    @register="openRegisterFlyout"
  />
</template>

<style scoped>
/* ── Page ── */
.sf-page {
  width: 100%;
  max-width: 960px;
  animation: sf-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  padding-bottom: 3rem;
}

@keyframes sf-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sf-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.sf-page__eyebrow {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vz-text3);
  margin-bottom: 0.35rem;
}

.sf-page__title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.sf-page__title {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--vz-text);
  line-height: 1;
  margin-bottom: 0;
}

.sf-diagram-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--vz-border2);
  background: var(--vz-surface);
  cursor: pointer;
  color: var(--vz-text3);
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
  flex-shrink: 0;
  margin-top: 2px;
}

.sf-diagram-btn:hover {
  color: var(--vz-orange);
  border-color: var(--vz-orange);
  background: var(--vz-orange-dim);
}

.sf-page__sub {
  font-size: 0.92rem;
  color: var(--vz-text2);
  line-height: 1.6;
}

/* ── Clients (outer) table ── */
.sf-clients-wrap {
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-lg);
  overflow: hidden;
}

.sf-clients {
  width: 100%;
  border-collapse: collapse;
}

.sf-clients thead tr {
  background: var(--vz-surface);
}

.sf-clients th {
  padding: 0.55rem 1rem;
  text-align: left;
  font-family: var(--vz-font-mono);
  font-size: 0.67rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
  border-bottom: 1px solid var(--vz-border);
  white-space: nowrap;
}

.sf-client-row {
  cursor: pointer;
  transition: background 0.12s;
}

.sf-client-row:hover {
  background: var(--vz-surface);
}
.sf-client-row--open {
  background: var(--vz-surface);
}

.sf-td {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--vz-border);
  color: var(--vz-text2);
  vertical-align: middle;
}

.sf-td--name {
  font-weight: 500;
  color: var(--vz-text);
  white-space: nowrap;
}
.sf-td--mono {
  font-family: var(--vz-font-mono);
  font-size: 0.75rem;
  white-space: nowrap;
}
.sf-td--url {
  font-size: 0.8rem;
  color: var(--vz-text3);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sf-td--controls {
  width: 1px;
  white-space: nowrap;
  padding: 0.5rem 0.75rem;
}

.sf-row-btns {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

/* ── Expand row ── */
.sf-expand-row .sf-expand-cell {
  padding: 0;
  border-bottom: 1px solid var(--vz-border);
  background: color-mix(in srgb, var(--vz-surface) 60%, var(--vz-bg));
}

.sf-expand {
  padding: 1.1rem 1.25rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Users (inner) table ── */
.sf-users-wrap {
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  overflow: hidden;
}

.sf-users {
  width: 100%;
  border-collapse: collapse;
}

.sf-users thead tr {
  background: var(--vz-bg);
}

.sf-users th {
  padding: 0.45rem 0.85rem;
  text-align: left;
  font-family: var(--vz-font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
  border-bottom: 1px solid var(--vz-border);
  white-space: nowrap;
}

.sf-th--center {
  text-align: center;
}

.sf-user-row {
  transition: background 0.1s;
}
.sf-user-row:hover {
  background: var(--vz-surface);
}

.sf-utd {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--vz-border);
  font-size: 0.82rem;
  color: var(--vz-text2);
  vertical-align: middle;
}

.sf-user-row:last-child .sf-utd {
  border-bottom: none;
}

.sf-utd--user {
  font-weight: 500;
  color: var(--vz-text);
  white-space: nowrap;
}
.sf-utd--instance {
  font-family: var(--vz-font-mono);
  font-size: 0.75rem;
  color: var(--vz-text3);
}
.sf-utd--time {
  font-family: var(--vz-font-mono);
  font-size: 0.75rem;
  white-space: nowrap;
}
.sf-utd--action {
  text-align: center;
  width: 1px;
  white-space: nowrap;
}

/* ── Status pill ── */
.sf-status {
  display: inline-block;
  font-family: var(--vz-font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.12rem 0.45rem;
  border-radius: var(--vz-radius);
  font-weight: 600;
}

.sf-status--active {
  background: color-mix(in srgb, var(--vz-orange) 14%, transparent);
  color: var(--vz-orange);
}
.sf-status--expired {
  background: color-mix(in srgb, var(--vz-text3) 14%, transparent);
  color: var(--vz-text3);
}

/* ── Get token for new user ── */
.sf-new-user {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
}

.sf-new-user__label {
  font-family: var(--vz-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vz-text3);
  white-space: nowrap;
}

.sf-username-input {
  flex: 1;
  min-width: 200px;
  background: var(--vz-surface);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-md);
  padding: 0.48rem 0.8rem;
  font-size: 0.875rem;
  font-family: var(--vz-font-sans);
  color: var(--vz-text);
  outline: none;
  transition: border-color 0.15s;
}

.sf-username-input::placeholder {
  color: var(--vz-text3);
}
.sf-username-input:focus {
  border-color: var(--vz-text2);
}

/* ── Icons ── */
.sf-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  border-radius: var(--vz-radius);
  cursor: pointer;
  color: var(--vz-text3);
  transition:
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
}

.sf-icon-btn:hover {
  color: var(--vz-orange);
  background: var(--vz-orange-dim);
}
.sf-icon-btn--danger:hover {
  color: var(--vz-red);
  background: none;
}
.sf-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.sf-chevron {
  color: var(--vz-text3);
  transition: transform 0.2s;
  margin-left: 0.15rem;
}

.sf-chevron--open {
  transform: rotate(180deg);
}

/* ── Flyout form ── */
.sf-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}
@media (max-width: 480px) {
  .sf-form__row {
    grid-template-columns: 1fr;
  }
}

.sf-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sf-field__label {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.sf-field__textarea {
  width: 100%;
  background: var(--vz-surface);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-md);
  padding: 0.75rem 0.9rem;
  font-size: 0.78rem;
  font-family: var(--vz-font-mono);
  color: var(--vz-text);
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
  box-sizing: border-box;
  line-height: 1.6;
}

.sf-field__textarea::placeholder {
  color: var(--vz-text3);
}
.sf-field__textarea:focus {
  border-color: var(--vz-text2);
}

/* ── Overlay + flyout ── */
.sf-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 299;
  backdrop-filter: blur(2px);
}

.sf-fade-enter-active,
.sf-fade-leave-active {
  transition: opacity 0.2s;
}
.sf-fade-enter-from,
.sf-fade-leave-to {
  opacity: 0;
}

.sf-flyout {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 440px;
  max-width: 100vw;
  background: var(--vz-bg);
  border-left: 1px solid var(--vz-border);
  z-index: 300;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.sf-flyout--open {
  transform: translateX(0);
}

.sf-flyout__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--vz-border);
  flex-shrink: 0;
}

.sf-flyout__title {
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--vz-text2);
}

.sf-flyout__body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.sf-flyout__footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
  flex-wrap: wrap;
}

/* ── CLI panel ── */
.sf-cli {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 360px;
  background: #0d0d0d;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 300;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.sf-cli--open {
  transform: translateY(0);
}

.sf-cli__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.sf-cli__head-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sf-cli__label {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
}

.sf-cli__context {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
}

.sf-cli__user {
  font-family: var(--vz-font-mono);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.28);
}

.sf-cli__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.28);
  border-radius: var(--vz-radius);
  transition: color 0.15s;
}

.sf-cli__close:hover {
  color: #f76300;
}

.sf-cli__editor {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.sf-cli__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  resize: none;
  font-family: var(--vz-font-mono);
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  height: 52px;
  caret-color: rgba(255, 255, 255, 0.7);
}

.sf-cli__input::placeholder {
  color: rgba(255, 255, 255, 0.18);
}

.sf-cli__run-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
}

.sf-cli__hint {
  font-family: var(--vz-font-mono);
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.16);
}

.sf-cli__output {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem 1rem;
}

.sf-cli__error {
  font-family: var(--vz-font-mono);
  font-size: 0.8rem;
  color: #f87171;
}

.sf-cli__dim {
  font-family: var(--vz-font-mono);
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.2);
}

.sf-cli__meta {
  font-family: var(--vz-font-mono);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.26);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.sf-cli__table-wrap {
  overflow-x: auto;
}

.sf-cli__table {
  border-collapse: collapse;
  font-family: var(--vz-font-mono);
  font-size: 0.76rem;
  white-space: nowrap;
  width: 100%;
}

.sf-cli__table th {
  text-align: left;
  padding: 0.3rem 1.5rem 0.3rem 0;
  color: rgba(255, 255, 255, 0.28);
  font-weight: 500;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.sf-cli__table td {
  padding: 0.28rem 1.5rem 0.28rem 0;
  color: rgba(255, 255, 255, 0.68);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-cli__table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

/* ── Misc ── */
.sf-msg {
  font-size: 0.85rem;
  color: var(--vz-text3);
}
.sf-msg--err {
  color: var(--vz-red);
}
</style>
