<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, TextInput, Button } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import DiagramModal from "../../components/DiagramModal.vue";
import JwtBearerDiagram from "../../components/JwtBearerDiagram.vue";
import SfSetupModal from "../../components/SfSetupModal.vue";
import { useSalesforce } from "../../composables/useSalesforce";

const router = useRouter();
const auth = useAuthStore();

const diagramOpen = ref(false);
const setupOpen = ref(false);

const {
  clients,
  loadError,
  expandedId,
  deletingId,
  loadClients,
  handleDelete,
  toggleExpand,
  userTokens,
  tokensLoading,
  newUsernameInputs,
  gettingToken,
  getTokenErrors,
  handleGetToken,
  handleRefreshToken,
  handleDeleteToken,
  relativeTime,
  isExpired,
  flyoutOpen,
  flyoutMode,
  flyoutForm,
  flyoutError,
  flyoutSaving,
  openRegisterFlyout,
  openEditFlyout,
  closeFlyout,
  handleFlyoutSubmit,
  cliOpen,
  cliClient,
  cliUsername,
  cliSoql,
  cliRunning,
  cliResult,
  cliError,
  cliColumns,
  openCli,
  closeCli,
  runQuery,
  cellValue,
} = useSalesforce();

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
        <Button variant="primary" @click="openRegisterFlyout"
          >+ Register</Button
        >
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

<style scoped src="./SalesforceView.css"></style>
