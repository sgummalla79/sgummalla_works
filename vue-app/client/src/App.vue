<script setup lang="ts">
import { provide } from "vue";
import { useAuthStore } from "./stores/auth";
import { getProfile, saveProfile } from "./api/profile";

const auth = useAuthStore();

async function loadAccentColor(): Promise<string | null> {
  if (!auth.isAuthenticated) return null;
  try {
    const profile = await getProfile();
    return profile.accentColor;
  } catch {
    return null;
  }
}

async function saveAccentColor(color: string): Promise<void> {
  if (!auth.isAuthenticated) return;
  try {
    await saveProfile({ accentColor: color });
  } catch {
    // silently ignore — color is already applied locally
  }
}

provide("loadAccentColor", loadAccentColor);
provide("saveAccentColor", saveAccentColor);
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <transition name="page">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>
