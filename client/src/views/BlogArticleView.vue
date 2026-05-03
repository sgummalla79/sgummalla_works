<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../stores/auth";
import { getArticle, type Article } from "../api/articles";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

// Watch color-scheme on <html> rather than localStorage, so it reacts
// to AppLayout's setTheme() call regardless of auth state or tab focus.
const isLight = ref(false);
let themeObserver: MutationObserver | null = null;

onMounted(() => {
  const update = () => {
    isLight.value =
      document.documentElement.style.getPropertyValue("color-scheme") ===
      "light";
  };
  update();
  themeObserver = new MutationObserver(update);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  });
});

onUnmounted(() => themeObserver?.disconnect());

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

      <div
        class="vz-article-body"
        :class="{ 'vz-article-body--light': isLight }"
        v-html="article.content"
      />

      <div class="vz-article-disclaimer">
        <strong>Disclaimer:</strong> The information in this article is based on
        generally available (GA) features and publicly accessible documentation
        at the time of publication. It does not represent official guidance from
        any employer or organisation and does not disclose any confidential,
        pre-release, or proprietary information. Product features, behaviour,
        and documentation may change over time. Please refer to the latest
        official documentation and verify all information before making any
        technical or business decisions.
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.vz-article-wrapper {
  width: 100%;
  max-width: 1180px;
  animation: vz-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes vz-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vz-article-nav {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.vz-article-date {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--vz-text3);
}

.vz-article-back {
  background: none;
  border: none;
  font-family: var(--vz-font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--vz-text3);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.vz-article-back:hover {
  color: var(--vz-orange);
}

.vz-article-disclaimer {
  margin-top: 2rem;
  padding: 0.85rem 1.25rem;
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius);
  font-size: 0.75rem;
  color: var(--vz-text3);
  line-height: 1.65;
  font-family: var(--vz-font-mono);
}

.vz-article-disclaimer strong {
  color: var(--vz-text2);
}
</style>

<!-- Article body styles loaded globally via src/styles/article.css -->
