<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { fetchPendingLink, type PendingLink } from "../api/auth";

const router = useRouter();
const pending = ref<PendingLink | null>(null);
const loading = ref(true);

const PROVIDER_NAMES: Record<string, string> = {
  "google-oauth2": "Google",
  github: "GitHub",
  windowslive: "Microsoft",
  twitter: "Twitter",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  apple: "Apple",
  auth0: "Email / Password",
};

function providerLabel(strategy: string): string {
  return PROVIDER_NAMES[strategy] ?? strategy;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

onMounted(async () => {
  pending.value = await fetchPendingLink();
  loading.value = false;
  if (!pending.value) {
    await router.replace({ name: "login" });
  }
});
</script>

<template>
  <AppLayout active-page="">
    <div v-if="!loading && pending" class="vz-link">
      <div class="vz-link__icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          />
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          />
        </svg>
      </div>

      <h1 class="vz-link__title">Account already exists</h1>

      <p class="vz-link__body">
        <span class="vz-link__email">{{ pending.email }}</span>
        is already registered via
        <span class="vz-link__provider">{{
          providerLabel(pending.primaryProvider)
        }}</span
        >. You just signed in with
        <span class="vz-link__provider">{{
          providerLabel(pending.secondaryProvider)
        }}</span
        >.
      </p>

      <p class="vz-link__hint">
        Link both accounts so you can sign in with either provider going
        forward.
      </p>

      <div class="vz-link__actions">
        <a :href="`${API_URL}/api/auth0/link`" class="vz-link__btn-primary">
          Link accounts
        </a>
        <a
          :href="`${API_URL}/api/auth0/link?action=skip`"
          class="vz-link__btn-ghost"
        >
          Keep separate
        </a>
      </div>

      <p class="vz-link__note">
        Linking requires re-authentication to confirm you own both accounts.
      </p>
    </div>

    <template #footer>
      <div class="vz-link-footer-live">
        <span class="vz-link-footer-dot" />
        Live
      </div>
      <span class="vz-link-footer-tagline"
        >Ideas in Motion, Think. Build. Demo.</span
      >
    </template>
  </AppLayout>
</template>

<style scoped>
.vz-link {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  animation: vz-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes vz-fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vz-link__icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vz-text2);
  margin-bottom: 0.25rem;
}

.vz-link__title {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--vz-text);
  line-height: 1.2;
}

.vz-link__body {
  font-size: 0.9rem;
  color: var(--vz-text2);
  line-height: 1.6;
}

.vz-link__email {
  font-family: var(--vz-font-mono);
  font-size: 0.82rem;
  color: var(--vz-text);
}

.vz-link__provider {
  font-weight: 600;
  color: var(--vz-text);
}

.vz-link__hint {
  font-size: 0.875rem;
  color: var(--vz-text2);
  line-height: 1.6;
}

.vz-link__actions {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
  margin-top: 0.5rem;
}

.vz-link__btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.65rem 1rem;
  background: transparent;
  color: var(--vz-orange);
  border: 1px solid var(--vz-orange);
  border-radius: var(--vz-radius-md);
  font-family: var(--vz-font-sans);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
  box-sizing: border-box;
}

.vz-link__btn-primary:hover {
  background: var(--vz-orange);
  color: #fff;
}

.vz-link__btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.65rem 1rem;
  background: none;
  color: var(--vz-text2);
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  font-family: var(--vz-font-sans);
  font-size: 0.9rem;
  text-decoration: none;
  transition:
    border-color 0.15s,
    color 0.15s;
  box-sizing: border-box;
}

.vz-link__btn-ghost:hover {
  color: var(--vz-orange);
  border-color: var(--vz-orange);
}

.vz-link__note {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  color: var(--vz-text3);
  margin-top: 0.25rem;
}

/* ── Footer ─────────────────────────────────── */

.vz-link-footer-live {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-mono);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.vz-link-footer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vz-red);
  flex-shrink: 0;
  animation: vz-dot-pulse 2.5s ease-in-out infinite;
}

@keyframes vz-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.vz-link-footer-tagline {
  font-family: var(--vz-font-mono);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
}
</style>
