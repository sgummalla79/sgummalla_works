<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import type { LightningOutSession } from "../api/salesforceExchange";
import {
  mountLightningOut,
  waitForLightningOutComponents,
} from "../utils/lightningOut";

const props = defineProps<{
  session: LightningOutSession | null;
  idleMessage: string;
}>();
const emit = defineEmits<{ close: [] }>();

const container = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

// (Re)mount whenever a new session arrives; clear when it is dropped.
watch(
  () => props.session,
  async (session) => {
    error.value = null;
    container.value?.replaceChildren();
    if (!session || !container.value) {
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      await mountLightningOut(container.value, session);
      await waitForLightningOutComponents(session.components);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Lightning Out failed to load";
    } finally {
      loading.value = false;
    }
  },
);

onBeforeUnmount(() => container.value?.replaceChildren());
</script>

<template>
  <section class="lo-panel">
    <div class="lo-panel__bar">
      <span class="lo-panel__title">Salesforce · Lightning Out</span>
      <button
        v-if="session"
        class="lo-panel__close"
        title="Clear"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="lo-panel__stage">
      <div
        ref="container"
        class="lo-panel__body"
        :class="{ 'lo-panel__body--hidden': !session }"
      />

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
  min-height: 22rem;
  background: #0b1120;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
}
.lo-panel__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-family: ui-monospace, "SF Mono", "Fira Code", monospace;
}
.lo-panel__title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
}
.lo-panel__close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
}
.lo-panel__stage {
  position: relative;
  flex: 1;
  display: flex;
}
.lo-panel__body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: #f4f6f9;
}
.lo-panel__body--hidden {
  display: none;
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
  background: #0b1120;
  color: rgba(255, 255, 255, 0.75);
  font-family: ui-monospace, "SF Mono", "Fira Code", monospace;
}
.lo-panel__icon {
  color: #1b96ff;
  opacity: 0.85;
}
.lo-panel__message {
  margin: 0;
  max-width: 18rem;
  font-size: 0.82rem;
  line-height: 1.6;
}
.lo-panel__note {
  margin: 0;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}
.lo-panel__error {
  margin: 0;
  color: #f87171;
  font-size: 0.8rem;
}
.lo-panel__spinner {
  width: 1.6rem;
  height: 1.6rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
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
