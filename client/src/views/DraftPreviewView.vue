<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../stores/auth";
import { getDraft, publishDraft, type Article } from "../api/articles";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

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

        <div
          class="vz-article-body"
          :class="{ 'vz-article-body--light': isLight }"
          v-html="article.content"
        />

        <div class="vz-article-disclaimer">
          <strong>Disclaimer:</strong> The information in this article is based
          on generally available (GA) features and publicly accessible
          documentation at the time of publication. It does not represent
          official guidance from any employer or organisation and does not
          disclose any confidential, pre-release, or proprietary information.
          Product features, behaviour, and documentation may change over time.
          Please refer to the latest official documentation and verify all
          information before making any technical or business decisions.
        </div>

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

<style scoped>
/* ── Page wrapper — stacks banner above article vertically ───────────────── */
.vz-draft-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1180px;
  gap: 1.5rem;
}

/* ── Draft banner ────────────────────────────────────────────────────────── */
.vz-draft-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: rgba(245, 158, 11, 0.1);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  flex-wrap: wrap;
}

.vz-draft-publish-bottom {
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.vz-draft-banner__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.vz-draft-banner__badge {
  font-family: var(--vz-font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: var(--vz-radius-sm);
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.35);
  white-space: nowrap;
}

.vz-draft-banner__msg {
  font-size: 0.8rem;
  color: var(--vz-text2);
}

.vz-draft-banner__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.vz-draft-banner__back {
  background: none;
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-sm);
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  color: var(--vz-text2);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.vz-draft-banner__back:hover {
  color: var(--vz-orange);
  border-color: var(--vz-orange);
}

.vz-draft-banner__publish {
  background: transparent;
  color: var(--vz-orange);
  border: 1px solid var(--vz-orange);
  border-radius: var(--vz-radius-sm);
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.vz-draft-banner__publish:hover:not(:disabled) {
  background: var(--vz-orange);
  color: #fff;
}

.vz-draft-banner__publish:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Article styles (mirrors BlogArticleView) ──────────────────────────── */
.vz-article-wrapper {
  width: 100%;
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
