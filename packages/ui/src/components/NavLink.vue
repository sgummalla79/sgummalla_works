<script setup lang="ts">
defineProps<{
  href: string;
  active?: boolean;
}>();
</script>

<template>
  <a
    :href="href"
    class="vz-nav-link"
    :class="{ 'vz-nav-link--active': active }"
  >
    <slot />
  </a>
</template>

<style scoped>
.vz-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 100%;
  padding: 0 1rem;
  font-size: 0.82rem;
  font-family: var(--vz-font-sans);
  font-weight: 500;
  color: var(--vz-text2);
  text-decoration: none;
  letter-spacing: 0.01em;
  position: relative;
  transition: color 0.15s;
}

.vz-nav-link::after {
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

.vz-nav-link:hover {
  color: var(--vz-orange);
}

.vz-nav-link:hover::after,
.vz-nav-link--active::after {
  transform: scaleX(1);
}

.vz-nav-link--active {
  color: var(--vz-orange);
}
</style>
