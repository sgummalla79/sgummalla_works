<script setup lang="ts">
defineProps<{ open: boolean; title: string }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="dm-fade">
      <div v-if="open" class="dm-overlay" @click.self="$emit('close')">
        <div class="dm-modal">
          <div class="dm-header">
            <span class="dm-title">{{ title }}</span>
            <button class="dm-close" @click="$emit('close')">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="dm-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.dm-modal {
  /* Uses the app's --vz-* variables so it adapts to light/dark theme automatically */
  background: var(--vz-bg);
  border: 1px solid var(--vz-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 96vh;
  width: auto;
  max-width: 99vw;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}

.dm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--vz-border);
  flex-shrink: 0;
}

.dm-title {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text2);
}

.dm-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--vz-text3);
  transition:
    color 0.15s,
    background 0.15s;
}
.dm-close:hover {
  color: var(--vz-orange);
  background: var(--vz-orange-dim);
}

.dm-body {
  overflow: auto;
  padding: 1.25rem;
  flex: 1;
  scrollbar-width: none;
}
.dm-body::-webkit-scrollbar {
  display: none;
}

.dm-fade-enter-active,
.dm-fade-leave-active {
  transition: opacity 0.2s;
}
.dm-fade-enter-from,
.dm-fade-leave-to {
  opacity: 0;
}
</style>
