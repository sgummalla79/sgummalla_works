<script setup lang="ts">
defineProps<{
  label: string;
  active?: boolean;
}>();
</script>

<template>
  <div class="vz-nav-group">
    <button
      class="vz-nav-group__trigger"
      :class="{ 'vz-nav-group__trigger--active': active }"
    >
      <slot name="icon" />
      {{ label }}
      <svg
        class="vz-nav-group__chevron"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div class="vz-nav-group__dropdown">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.vz-nav-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
}

.vz-nav-group__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
  padding: 0 1rem;
  font-size: 0.82rem;
  font-family: var(--vz-font-sans);
  font-weight: 500;
  color: var(--vz-text2);
  background: none;
  border: none;
  cursor: pointer;
  letter-spacing: 0.01em;
  position: relative;
  transition: color 0.15s;
}

.vz-nav-group__trigger::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0.75rem;
  right: 0.75rem;
  height: 1.5px;
  background: var(--vz-orange);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.vz-nav-group:hover .vz-nav-group__trigger,
.vz-nav-group__trigger--active {
  color: var(--vz-orange);
}

.vz-nav-group:hover .vz-nav-group__trigger::after,
.vz-nav-group__trigger--active::after {
  transform: scaleX(1);
}

.vz-nav-group__chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
  opacity: 0.6;
}

.vz-nav-group:hover .vz-nav-group__chevron {
  transform: rotate(180deg);
}

/* Dropdown */
.vz-nav-group__dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: var(--vz-bg2);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 50;
}

.vz-nav-group:hover .vz-nav-group__dropdown {
  display: block;
}

/* Style NavLinks inside the dropdown as vertical items */
.vz-nav-group__dropdown :deep(.vz-nav-link) {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: auto;
  padding: 0.65rem 1rem;
  font-size: 0.855rem;
  color: var(--vz-text2);
  border-bottom: 1px solid var(--vz-border);
  white-space: nowrap;
}

.vz-nav-group__dropdown :deep(.vz-nav-link:last-child) {
  border-bottom: none;
}

.vz-nav-group__dropdown :deep(.vz-nav-link::after) {
  display: none;
}

.vz-nav-group__dropdown :deep(.vz-nav-link:hover),
.vz-nav-group__dropdown :deep(.vz-nav-link--active) {
  background: var(--vz-orange);
  color: #fff;
}
</style>
