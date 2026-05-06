<script setup lang="ts">
defineProps<{
  /** Current theme mode — controls which icon is shown */
  mode: "dark" | "light";
}>();

defineEmits<{ toggle: [] }>();
</script>

<template>
  <button
    class="vz-theme-toggle"
    :aria-label="`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`"
    @click="$emit('toggle')"
  >
    <!-- Sun icon — shown in dark mode (click to go light) -->
    <svg
      v-if="mode === 'dark'"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>

    <!-- Moon icon — shown in light mode (click to go dark) -->
    <svg
      v-else
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
.vz-theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-md);
  color: var(--vz-text2);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
  flex-shrink: 0;
}

.vz-theme-toggle:hover {
  color: var(--vz-orange);
  border-color: var(--vz-orange);
  background: var(--vz-orange-dim);
}
</style>
