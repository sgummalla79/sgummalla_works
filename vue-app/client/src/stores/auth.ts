import { signOutOfSalesforce } from "../utils/salesforceLogout";
import { LOGIN_PATH } from "../utils/sessionConstants";
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  login as apiLogin,
  logout as apiLogout,
  me,
  type ApiUser,
} from "../api/auth";

export const useAuthStore = defineStore("auth", () => {
  // ── State ───────────────────────────────────────────────────────────────────
  const user = ref<ApiUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const bootstrapped = ref(false);

  // ── Getters ─────────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => user.value !== null);
  const isOwner = computed(
    () => user.value?.id === "auth0|68d40e8f46b12057807fce21",
  );
  const fullName = computed(() => user.value?.name ?? "");
  const email = computed(() => user.value?.email ?? "");

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function bootstrap(): Promise<void> {
    if (bootstrapped.value) return;
    try {
      user.value = await me();
    } catch {
      user.value = null;
    } finally {
      bootstrapped.value = true;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      user.value = await apiLogin({ email, password });
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Login failed";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await signOutOfSalesforce(await apiLogout());
    } catch {
      // Leave anyway: a failed logout call must not keep the user on a page
      // that still shows the previous session's Salesforce content.
    } finally {
      user.value = null;
      bootstrapped.value = false;
      loading.value = false;
    }

    // Full reload drops in-memory state such as the Lightning Out script, which
    // would otherwise keep the previous user's Salesforce session.
    window.location.replace(LOGIN_PATH);

    // The page is unloading. Never resolve, so the router.push that every view
    // runs after logout cannot start a second navigation that races this one.
    await new Promise<never>(() => undefined);
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    user,
    loading,
    error,
    bootstrapped,
    isAuthenticated,
    isOwner,
    fullName,
    email,
    bootstrap,
    login,
    logout,
    clearError,
  };
});
