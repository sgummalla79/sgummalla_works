<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "ghost" | "danger";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    variant: "primary",
    type: "button",
    disabled: false,
    loading: false,
    fullWidth: false,
  },
);

// click falls through via $attrs — do not add to emits
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'vz-btn',
      `vz-btn--${variant}`,
      { 'vz-btn--full': fullWidth, 'vz-btn--loading': loading },
    ]"
    v-bind="$attrs"
  >
    <span v-if="loading" class="vz-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.vz-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font-family: var(--vz-font-sans);
  font-size: 0.94rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
  border-radius: var(--vz-radius-md);
  cursor: pointer;
  transition:
    opacity 0.15s,
    transform 0.15s,
    background 0.15s,
    border-color 0.15s;
  white-space: nowrap;
  user-select: none;
}

.vz-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.vz-btn:active:not(:disabled) {
  transform: translateY(0);
}

.vz-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Variants ── */
.vz-btn--primary {
  background: transparent;
  color: var(--vz-orange);
  border-color: var(--vz-orange);
}
.vz-btn--primary:hover:not(:disabled) {
  background: var(--vz-orange);
  color: #fff;
  border-color: var(--vz-orange);
}

.vz-btn--ghost {
  background: transparent;
  color: var(--vz-text2);
  border-color: var(--vz-border2);
}
.vz-btn--ghost:hover:not(:disabled) {
  border-color: var(--vz-orange);
  color: var(--vz-orange);
  background: var(--vz-orange-dim);
}

.vz-btn--danger {
  background: var(--vz-red-dim);
  color: var(--vz-red);
  border-color: var(--vz-red);
}
.vz-btn--danger:hover:not(:disabled) {
  opacity: 0.85;
}

/* ── Modifiers ── */
.vz-btn--full {
  width: 100%;
}

/* ── Spinner ── */
.vz-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: vz-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes vz-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
