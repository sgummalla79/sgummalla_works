<script setup lang="ts">
defineProps<{
  brand?: string;
}>();

defineEmits<{ "toggle-theme": [] }>();
</script>

<template>
  <nav class="vz-nav">
    <!-- Brand -->
    <a href="/" class="vz-nav-brand">
      <slot name="brand">{{ brand }}</slot>
    </a>

    <!-- Centre links -->
    <div class="vz-nav-links">
      <slot name="links" />
    </div>

    <!-- Right actions -->
    <div class="vz-nav-right">
      <slot name="right" />
    </div>
  </nav>
</template>

<style scoped>
.vz-nav {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: 72px;
  padding: 0 2rem;
  border-bottom: 1px solid var(--vz-border);
  background: var(--vz-nav-bg);
  backdrop-filter: blur(12px);
}

.vz-nav-brand {
  font-family: var(--vz-font-mono);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--vz-text);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding-right: 2rem;
  border-right: 1px solid var(--vz-border);
  height: 100%;
  transition: opacity 0.15s;
}

.vz-nav-brand:hover {
  opacity: 0.75;
}

.vz-nav-links {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 1.5rem;
}

.vz-nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-left: 2rem;
  border-left: 1px solid var(--vz-border);
  height: 100%;
}
</style>
