<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import { getDraft, publishDraft, type Article } from "../../api/articles";
import ArticleBody from "../../components/ArticleBody/ArticleBody.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const article = ref<Article | null>(null);
const publishing = ref(false);
const published = ref(false);

watch(
  () => route.params.slug,
  async (slug) => {
    article.value = null;
    publishing.value = false;
    published.value = false;
    try {
      article.value = await getDraft(slug as string);
    } catch {
      router.replace("/drafts");
    }
  },
  { immediate: true },
);

async function handlePublish() {
  if (!article.value || publishing.value) return;
  publishing.value = true;
  try {
    await publishDraft(article.value.slug);
    published.value = true;
    setTimeout(() => router.push("/blog"), 1500);
  } finally {
    publishing.value = false;
  }
}

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
    <div class="vz-draft-page">
      <!-- Draft banner — top of page, non-sticky -->
      <div class="vz-draft-banner">
        <div class="vz-draft-banner__left">
          <span class="vz-draft-banner__badge">Draft Preview</span>
          <span class="vz-draft-banner__msg"
            >This article is not yet published. Reviewing below as it will
            appear publicly.</span
          >
        </div>
        <div class="vz-draft-banner__actions">
          <button class="vz-draft-banner__back" @click="router.push('/drafts')">
            ← Back to Drafts
          </button>
          <button
            class="vz-draft-banner__publish"
            :disabled="publishing || published"
            @click="handlePublish"
          >
            {{
              published
                ? "Published ✓"
                : publishing
                  ? "Publishing…"
                  : "Publish Article"
            }}
          </button>
        </div>
      </div>

      <div v-if="article" class="vz-article-wrapper">
        <div class="vz-article-nav">
          <span class="vz-article-date">Published {{ article.date }}</span>
        </div>

        <ArticleBody :content="article.content ?? ''" />

        <div class="vz-draft-publish-bottom">
          <button class="vz-draft-banner__back" @click="router.push('/drafts')">
            ← Back to Drafts
          </button>
          <button
            class="vz-draft-banner__publish"
            :disabled="publishing || published"
            @click="handlePublish"
          >
            {{
              published
                ? "Published ✓"
                : publishing
                  ? "Publishing…"
                  : "Publish Article"
            }}
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped src="./DraftPreviewView.css"></style>
