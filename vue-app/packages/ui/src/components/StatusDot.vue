<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Semantic color — maps to a CSS var */
    color?: "green" | "red" | "amber" | "muted";
    /** Whether the dot pulses — true for live indicators */
    pulse?: boolean;
    /** Size in px */
    size?: number;
  }>(),
  {
    color: "green",
    pulse: true,
    size: 6,
  },
);
</script>

<template>
  <span
    class="vz-dot"
    :class="[`vz-dot--${color}`, { 'vz-dot--pulse': pulse }]"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.vz-dot {
  display: inline-block;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Colors ── */
.vz-dot--green {
  background: var(--vz-green);
}
.vz-dot--red {
  background: var(--vz-red);
}
.vz-dot--amber {
  background: var(--vz-amber);
}
.vz-dot--muted {
  background: var(--vz-text3);
}

/* ── Pulse animation ── */
.vz-dot--pulse {
  animation: vz-pulse 2.5s ease-in-out infinite;
}

@keyframes vz-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
</style>
