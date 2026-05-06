<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import { getArticle, type Article } from "../../api/articles";
import ArticleBody from "../../components/ArticleBody/ArticleBody.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const article = ref<Article | null>(null);

watch(
  () => route.params.slug,
  async (slug) => {
    article.value = null;
    try {
      article.value = await getArticle(slug as string);
    } catch {
      router.replace("/blog");
    }
  },
  { immediate: true },
);

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}
</script>

<template>
  <AppLayout
    active-page="blog"
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    :scrollable="true"
    @profile="router.push({ name: 'profile' })"
    @logout="handleLogout"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div v-if="article" class="vz-article-wrapper">
      <div class="vz-article-nav">
        <button class="vz-article-back" @click="router.push('/blog')">
          ← Back to Blog
        </button>
        <span class="vz-article-date">Published {{ article.date }}</span>
      </div>

      <ArticleBody :content="article.content ?? ''" />
    </div>
  </AppLayout>
</template>

<style scoped src="./BlogArticleView.css"></style>
