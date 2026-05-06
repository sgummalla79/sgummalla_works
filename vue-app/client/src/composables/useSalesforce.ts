import { ref, computed } from "vue";
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

type TokenRow = SfUserToken & { refreshing?: boolean; deleting?: boolean };

export function useSalesforce() {
  // ── Clients ───────────────────────────────────────────────────────────────

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

  // ── User tokens ───────────────────────────────────────────────────────────

  const userTokens = ref<Record<string, TokenRow[]>>({});
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

  async function handleRefreshToken(clientId: string, row: TokenRow) {
    row.refreshing = true;
    try {
      await refreshSfToken(clientId, row.sf_username);
      userTokens.value[clientId] = await getClientTokens(clientId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      console.error("Refresh failed:", e?.response?.data?.error);
    } finally {
      row.refreshing = false;
    }
  }

  async function handleDeleteToken(clientId: string, row: TokenRow) {
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

  // ── Flyout ────────────────────────────────────────────────────────────────

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

  // ── CLI panel ─────────────────────────────────────────────────────────────

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

  return {
    // clients
    clients,
    loadError,
    expandedId,
    deletingId,
    loadClients,
    handleDelete,
    toggleExpand,
    // tokens
    userTokens,
    tokensLoading,
    newUsernameInputs,
    gettingToken,
    getTokenErrors,
    loadUserTokens,
    handleGetToken,
    handleRefreshToken,
    handleDeleteToken,
    relativeTime,
    isExpired,
    // flyout
    flyoutOpen,
    flyoutMode,
    flyoutTarget,
    flyoutForm,
    flyoutError,
    flyoutSaving,
    openRegisterFlyout,
    openEditFlyout,
    closeFlyout,
    handleFlyoutSubmit,
    // cli
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
  };
}
