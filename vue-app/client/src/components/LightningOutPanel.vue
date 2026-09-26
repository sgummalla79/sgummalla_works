<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import type { LightningOutSession } from "../api/salesforceExchange";
import {
  HOST_MESSAGE,
  LIGHTNING_OUT_HOST_PATH,
  type HostToPanel,
  type PanelToHost,
} from "../utils/lightningOutFrameProtocol";

const props = defineProps<{
  session: LightningOutSession | null;
  idleMessage: string;
}>();
const emit = defineEmits<{
  close: [];
  "open-tab": [];
  "sign-out": [];
}>();

// Host of the Salesforce org the embedded session belongs to, shown in the frame.
const host = computed(() => {
  if (!props.session) return null;
  try {
    return new URL(props.session.scriptUrl).host;
  } catch {
    return null;
  }
});

const initial = computed(
  () => props.session?.sfUsername.charAt(0).toUpperCase() ?? "",
);

const frame = ref<HTMLIFrameElement | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

// Changing the key replaces the frame with a brand-new one. Each frame is its own
// JavaScript world, so every connect gets a clean Lightning Out runtime.
const frameKey = ref(0);

watch(
  () => props.session,
  (session) => {
    error.value = null;
    loading.value = Boolean(session);
    if (session) frameKey.value += 1;
  },
);

// Plain copy of only what the host needs (a reactive proxy cannot be posted).
function toMountable(session: LightningOutSession): PanelToHost {
  return {
    type: HOST_MESSAGE.MOUNT,
    session: {
      frontdoorUrl: session.frontdoorUrl,
      scriptUrl: session.scriptUrl,
      appId: session.appId,
      components: [...session.components],
    },
  };
}

function onFrameMessage(event: MessageEvent) {
  const target = frame.value?.contentWindow;
  // Only our own frame, same origin.
  if (!target || event.source !== target) return;
  if (event.origin !== window.location.origin) return;

  const message = event.data as HostToPanel | undefined;
  if (message?.type === HOST_MESSAGE.READY && props.session) {
    target.postMessage(toMountable(props.session), window.location.origin);
  } else if (message?.type === HOST_MESSAGE.STATUS) {
    loading.value = false;
    if (message.state === "error") error.value = message.message;
  }
}

onMounted(() => window.addEventListener("message", onFrameMessage));
onBeforeUnmount(() => window.removeEventListener("message", onFrameMessage));
</script>

<template>
  <section class="lo-panel">
    <div class="lo-panel__chrome">
      <span class="lo-panel__dots" aria-hidden="true"> <i /><i /><i /> </span>

      <div
        class="lo-panel__address"
        :class="{ 'lo-panel__address--idle': !host }"
        title="Salesforce · Lightning Out 2.0"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span class="lo-panel__host">{{ host ?? "Not connected" }}</span>
      </div>

      <span />
    </div>

    <div class="lo-panel__bar">
      <span class="lo-panel__title">Salesforce · Lightning Out</span>

      <div v-if="session" class="lo-panel__identity">
        <span class="lo-panel__avatar" aria-hidden="true">{{ initial }}</span>
        <span class="lo-panel__who">
          Signed in as <strong>{{ session.sfUsername }}</strong>
          <span class="lo-panel__org">· {{ session.orgLabel }}</span>
        </span>
      </div>
      <span v-else class="lo-panel__identity lo-panel__identity--idle"
        >Not signed in</span
      >

      <div v-if="session" class="lo-panel__actions">
        <button class="lo-panel__action" @click="emit('open-tab')">
          Open in new tab ↗
        </button>
        <button
          class="lo-panel__action lo-panel__action--danger"
          @click="emit('sign-out')"
        >
          Sign out of Salesforce
        </button>
        <button class="lo-panel__close" title="Close" @click="emit('close')">
          ✕
        </button>
      </div>
    </div>

    <div class="lo-panel__stage">
      <div
        class="lo-panel__body"
        :class="{ 'lo-panel__body--hidden': !session }"
      >
        <iframe
          v-if="session"
          :key="frameKey"
          ref="frame"
          class="lo-panel__frame"
          :src="LIGHTNING_OUT_HOST_PATH"
          title="Salesforce Lightning Out"
        />
      </div>

      <!-- Idle -->
      <div v-if="!session" class="lo-panel__state">
        <svg
          class="lo-panel__icon"
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 .5 9H7z"
          />
        </svg>
        <p class="lo-panel__message">{{ idleMessage }}</p>
        <p class="lo-panel__note">
          Third-party cookies must be allowed for this site.
        </p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="lo-panel__state" role="status">
        <span class="lo-panel__spinner" />
        <p class="lo-panel__message">
          Connecting to Salesforce and loading the component…
        </p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="lo-panel__state">
        <p class="lo-panel__error">{{ error }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lo-panel {
  display: flex;
  flex-direction: column;
  min-height: 26rem;
  background: var(--vz-bg);
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
}

/* Browser-window chrome: traffic lights, address pill, close */
.lo-panel__chrome {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) 4.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.9rem;
  background: var(--vz-surface);
  border-bottom: 1px solid var(--vz-border);
}

.lo-panel__dots {
  display: flex;
  gap: 0.4rem;
}

.lo-panel__dots i {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: var(--vz-border);
}

.lo-panel__dots i:nth-child(1) {
  background: #ff5f57;
}
.lo-panel__dots i:nth-child(2) {
  background: #febc2e;
}
.lo-panel__dots i:nth-child(3) {
  background: #28c840;
}

.lo-panel__address {
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  max-width: 34rem;
  padding: 0.28rem 0.85rem;
  background: var(--vz-bg);
  border: 1px solid var(--vz-border);
  border-radius: 999px;
  color: var(--vz-text2);
  font-family: var(--vz-font-mono);
  font-size: 0.74rem;
}

.lo-panel__address svg {
  flex: none;
  color: var(--vz-green);
}

.lo-panel__address--idle svg {
  color: var(--vz-text3);
}

.lo-panel__host {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lo-panel__close {
  background: none;
  border: none;
  color: var(--vz-text3);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.2rem 0.4rem;
  border-radius: var(--vz-radius-sm);
}

.lo-panel__close:hover {
  color: var(--vz-text);
  background: var(--vz-border);
}

/* Identity bar: title | who is signed in | actions */
.lo-panel__bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--vz-border);
}

.lo-panel__title {
  flex: none;
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vz-text);
}

.lo-panel__identity {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  font-size: 0.82rem;
  color: var(--vz-text2);
}

.lo-panel__identity--idle {
  color: var(--vz-text3);
}

.lo-panel__avatar {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 700;
}

.lo-panel__who {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lo-panel__who strong {
  color: var(--vz-text);
  font-weight: 600;
}

.lo-panel__org {
  color: var(--vz-text3);
}

.lo-panel__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lo-panel__action {
  padding: 0.3rem 0.7rem;
  background: transparent;
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-sm);
  color: var(--vz-text2);
  font-family: var(--vz-font-sans);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.lo-panel__action:hover {
  color: var(--vz-text);
  border-color: var(--vz-text3);
}

.lo-panel__action--danger:hover {
  color: #f87171;
  border-color: #f87171;
  background: rgba(248, 113, 113, 0.08);
}

@media (max-width: 800px) {
  .lo-panel__bar {
    flex-wrap: wrap;
  }
  .lo-panel__identity {
    order: 3;
    flex-basis: 100%;
    justify-content: flex-start;
  }
}

.lo-panel__stage {
  position: relative;
  flex: 1;
  display: flex;
}

/* Dark stage with a faint dot grid, so the Salesforce card stands out */
.lo-panel__body {
  flex: 1;
  display: flex;
  background-color: var(--vz-bg);
  background-image:
    radial-gradient(
      ellipse at 50% 0%,
      rgba(59, 130, 246, 0.14),
      transparent 60%
    ),
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size:
    100% 100%,
    18px 18px;
}

.lo-panel__body--hidden {
  display: none;
}

/* The host page paints nothing, so the dark stage shows through. color-scheme is
   pinned to the host page's own so the browser does not give the frame an opaque
   background when the app theme sets a different one. */
.lo-panel__frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: transparent;
  color-scheme: normal;
}

.lo-panel__state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  background: var(--vz-bg);
  color: var(--vz-text2);
  font-family: var(--vz-font-mono);
}

.lo-panel__icon {
  color: #1b96ff;
  opacity: 0.85;
}

.lo-panel__message {
  margin: 0;
  max-width: 22rem;
  font-size: 0.82rem;
  line-height: 1.6;
}

.lo-panel__note {
  margin: 0;
  font-size: 0.7rem;
  color: var(--vz-text3);
}

.lo-panel__error {
  margin: 0;
  color: #f87171;
  font-size: 0.8rem;
}

.lo-panel__spinner {
  width: 1.6rem;
  height: 1.6rem;
  border: 2px solid var(--vz-border);
  border-top-color: #1b96ff;
  border-radius: 50%;
  animation: lo-spin 0.8s linear infinite;
}

@keyframes lo-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
