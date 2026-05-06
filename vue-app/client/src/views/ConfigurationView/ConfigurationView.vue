<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { AppLayout, Button } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const auth = useAuthStore();
const metaContent = ref<string | null>(null);
const metaLabel = ref("");

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}

async function fetchMeta(type: "saml" | "oidc") {
  const url =
    type === "saml"
      ? "/api/saml/idp-metadata"
      : "/api/oidc/.well-known/openid-configuration";
  metaLabel.value = url;
  try {
    const res = await fetch(url, { credentials: "include" });
    const text = await res.text();

    if (!res.ok) {
      try {
        const json = JSON.parse(text) as { error?: string };
        metaContent.value = `⚠ ${json.error ?? "Server error"}`;
      } catch {
        metaContent.value = `⚠ Error ${res.status}`;
      }
      return;
    }

    metaContent.value =
      type === "oidc"
        ? (() => {
            try {
              return JSON.stringify(JSON.parse(text), null, 2);
            } catch {
              return text;
            }
          })()
        : text;
  } catch {
    metaContent.value = "⚠ Failed to connect to server";
  }
}
</script>

<template>
  <AppLayout
    active-page="configuration"
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    @profile="router.push({ name: 'profile' })"
    :scrollable="true"
    @logout="handleLogout"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div class="vz-config">
      <div class="vz-config__section-header">
        <p class="vz-config__eyebrow">Configuration</p>
        <h1 class="vz-config__title">Protocol Metadata</h1>
        <p class="vz-config__sub">
          Inspect the raw configuration documents for each protocol.
        </p>
      </div>

      <div class="vz-config__meta-row">
        <Button variant="ghost" @click="fetchMeta('saml')"
          >SAML Metadata</Button
        >
        <Button variant="ghost" @click="fetchMeta('oidc')"
          >OAuth / OIDC Config</Button
        >
        <Button v-if="metaContent" variant="ghost" @click="metaContent = null"
          >Clear ✕</Button
        >
      </div>

      <div v-if="metaContent" class="vz-config__meta-viewer">
        <div class="vz-config__meta-header">
          <span class="vz-config__meta-label">{{ metaLabel }}</span>
        </div>
        <pre class="vz-config__meta-body">{{ metaContent }}</pre>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped src="./ConfigurationView.css"></style>
