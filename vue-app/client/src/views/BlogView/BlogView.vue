<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import { listArticles, type Article } from "../../api/articles";

const PAGE_SIZE = 10;

const router = useRouter();
const auth = useAuthStore();
const articles = ref<Article[]>([]);
const loading = ref(true);
const page = ref(1);

const visible = computed(() => articles.value.slice(0, page.value * PAGE_SIZE));
const hasMore = computed(() => visible.value.length < articles.value.length);

onMounted(async () => {
  try {
    articles.value = await listArticles();
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
    <div class="vz-blog">
      <div class="vz-blog__header">
        <h1 class="vz-blog__title">Blog</h1>
        <p class="vz-blog__sub">Technical articles and architecture guides.</p>
      </div>

      <div v-if="loading" class="vz-blog__empty">Loading…</div>
      <div v-else-if="articles.length === 0" class="vz-blog__empty">
        No articles yet.
      </div>

      <div class="vz-blog__list">
        <template v-for="(article, idx) in visible" :key="article.slug">
          <article
            class="vz-blog__item"
            @click="router.push(`/blog/${article.slug}`)"
          >
            <div class="vz-blog__item-top">
              <span class="vz-blog__date">{{ article.date }}</span>
              <div class="vz-blog__tags">
                <span
                  v-for="tag in article.tags"
                  :key="tag"
                  class="vz-blog__tag"
                  >{{ tag }}</span
                >
              </div>
            </div>
            <h2 class="vz-blog__item-title">{{ article.title }}</h2>
            <p class="vz-blog__item-subtitle">{{ article.subtitle }}</p>
            <p class="vz-blog__item-desc">{{ article.description }}</p>
            <div class="vz-blog__read">Read article →</div>
          </article>
          <hr v-if="idx < visible.length - 1" class="vz-blog__sep" />
        </template>
      </div>

      <div v-if="hasMore" class="vz-blog__more">
        <button class="vz-blog__more-btn" @click="page++">Load more</button>
      </div>
    </div>

    <template #footer>
      <div class="vz-blog-footer-live">
        <span class="vz-blog-footer-dot" />
        Live
      </div>
      <span class="vz-blog-footer-tagline"
        >Ideas in Motion, Think. Build. Demo.</span
      >
    </template>
  </AppLayout>
</template>

<style scoped src="./BlogView.css"></style>
