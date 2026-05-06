<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import { listDrafts, type Article } from "../../api/articles";

const router = useRouter();
const auth = useAuthStore();
const drafts = ref<Article[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    drafts.value = await listDrafts();
  } finally {
    loading.value = false;
  }
});

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}
</script>

<template>
  <AppLayout
    active-page="drafts"
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    :scrollable="true"
    @profile="router.push({ name: 'profile' })"
    @logout="handleLogout"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div class="vz-drafts">
      <div class="vz-drafts__header">
        <h1 class="vz-drafts__title">Drafts</h1>
        <p class="vz-drafts__sub">
          Unpublished articles — preview and publish when ready.
        </p>
      </div>

      <div v-if="loading" class="vz-drafts__empty">Loading…</div>
      <div v-else-if="drafts.length === 0" class="vz-drafts__empty">
        No drafts — all articles are published.
      </div>

      <div v-else class="vz-drafts__list">
        <article
          v-for="draft in drafts"
          :key="draft.slug"
          class="vz-drafts__item"
          @click="router.push(`/drafts/${draft.slug}`)"
        >
          <div class="vz-drafts__item-top">
            <span class="vz-drafts__badge">Draft</span>
            <span class="vz-drafts__date">{{ draft.date }}</span>
            <div class="vz-drafts__tags">
              <span
                v-for="tag in draft.tags"
                :key="tag"
                class="vz-drafts__tag"
                >{{ tag }}</span
              >
            </div>
          </div>
          <h2 class="vz-drafts__item-title">{{ draft.title }}</h2>
          <p class="vz-drafts__item-subtitle">{{ draft.subtitle }}</p>
          <p class="vz-drafts__item-desc">{{ draft.description }}</p>
          <div class="vz-drafts__preview-link">Preview & Publish →</div>
        </article>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped src="./DraftsView.css"></style>
