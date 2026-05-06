<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, TextInput, Button } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import type { SfClient, SfUserToken, SoqlResult } from "../../api/salesforce";
import DiagramModal from "../../components/DiagramModal.vue";
import TokenExchangeDiagram from "../../components/TokenExchangeDiagram.vue";
import SfSetupModal from "../../components/SfSetupModal.vue";

const diagramOpen = ref(false);
const setupOpen = ref(false);
import {
  getExchangeClients,
  createExchangeClient,
  updateExchangeClient,
  deleteExchangeClient,
  deleteCachedExchangeToken,
  getExchangeClientTokens,
  getExchangeToken,
  refreshExchangeToken,
  runExchangeSoqlQuery,
} from "../../api/salesforceExchange";

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
      const created = await createExchangeClient({
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
      const updated = await updateExchangeClient(flyoutTarget.value.id, {
        label,
        client_id,
        login_url,
        ...(private_key ? { private_key } : {}),
      });
      const idx = clients.value.findIndex((x: SfClient) => x.id === updated.id);
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
    clients.value = await getExchangeClients();
  } catch {
    loadError.value = "Failed to load clients";
  }
}

async function handleDelete(c: SfClient) {
  deletingId.value = c.id;
  try {
    await deleteExchangeClient(c.id);
    clients.value = clients.value.filter((x: SfClient) => x.id !== c.id);
    if (expandedId.value === c.id) expandedId.value = null;
    delete userTokens.value[c.id];
  } finally {
    deletingId.value = null;
  }
}

// ── User tokens per client ────────────────────────────────────────────────────

const userTokens = ref<
  Record<string, (SfUserToken & { refreshing?: boolean; deleting?: boolean })[]>
>({});
const tokensLoading = ref<Record<string, boolean>>({});
const gettingToken = ref<Record<string, boolean>>({});
const getTokenErrors = ref<Record<string, string>>({});

async function toggleExpand(c: SfClient) {
  if (expandedId.value === c.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = c.id;
  if (!userTokens.value[c.id]) await loadUserTokens(c.id);
}

async function loadUserTokens(clientId: string) {
  tokensLoading.value[clientId] = true;
  try {
    userTokens.value[clientId] = await getExchangeClientTokens(clientId);
  } finally {
    tokensLoading.value[clientId] = false;
  }
}

async function handleGetToken(c: SfClient) {
  getTokenErrors.value[c.id] = "";
  gettingToken.value[c.id] = true;
  try {
    await getExchangeToken(c.id);
    await loadUserTokens(c.id);
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
    await refreshExchangeToken(clientId, row.sf_username);
    userTokens.value[clientId] = await getExchangeClientTokens(clientId);
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
    await deleteCachedExchangeToken(clientId, row.sf_username);
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
    cliResult.value = await runExchangeSoqlQuery(
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
    active-page="salesforce-exchange"
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
      <div class="sf-page__header">
        <div>
          <p class="sf-page__eyebrow">Salesforce</p>
          <div class="sf-page__title-row">
            <h1 class="sf-page__title">Token Exchange Authentication</h1>
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
            Exchange your web app session for a Salesforce user session token —
            no Salesforce username or password required.
          </p>
        </div>
        <Button variant="primary" @click="openRegisterFlyout"
          >+ Register</Button
        >
      </div>

      <p v-if="loadError" class="sf-msg sf-msg--err">{{ loadError }}</p>
      <p v-else-if="clients.length === 0" class="sf-msg">
        No clients registered yet. Click <strong>+ Register</strong> to add one.
      </p>

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

              <tr v-if="expandedId === c.id" class="sf-expand-row">
                <td colspan="4" class="sf-expand-cell">
                  <div class="sf-expand">
                    <p v-if="tokensLoading[c.id]" class="sf-msg">Loading…</p>
                    <template v-else>
                      <div
                        v-if="userTokens[c.id]?.length"
                        class="sf-users-wrap"
                      >
                        <table class="sf-users">
                          <thead>
                            <tr>
                              <th>Salesforce User</th>
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

                      <!-- Get token using the Auth0 id_token from the current session -->
                      <div class="sf-new-user">
                        <span class="sf-new-user__label"
                          >Exchange session for</span
                        >
                        <span class="sf-new-user__email">{{ auth.email }}</span>
                        <Button
                          variant="primary"
                          :loading="gettingToken[c.id]"
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
    title="Token Exchange Authentication — Sequence Diagram"
    @close="diagramOpen = false"
  >
    <TokenExchangeDiagram />
  </DiagramModal>

  <!-- Salesforce setup guide modal -->
  <SfSetupModal
    :open="setupOpen"
    flow="token-exchange"
    @close="setupOpen = false"
    @register="openRegisterFlyout"
  />
</template>

<style scoped src="./SalesforceExchangeView.css"></style>
