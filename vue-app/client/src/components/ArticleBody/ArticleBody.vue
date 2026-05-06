<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

defineProps<{ content: string }>();

const isLight = ref(false);
let observer: MutationObserver | null = null;

onMounted(() => {
  const update = () => {
    isLight.value =
      document.documentElement.style.getPropertyValue("color-scheme") ===
      "light";
  };
  update();
  observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  });
});

onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div
    class="vz-article-body"
    :class="{ 'vz-article-body--light': isLight }"
    v-html="content"
  />
  <div class="vz-article-disclaimer">
    <strong>Disclaimer:</strong> The information in this article is based on
    generally available (GA) features and publicly accessible documentation at
    the time of publication. It does not represent official guidance from any
    employer or organisation and does not disclose any confidential,
    pre-release, or proprietary information. Product features, behaviour, and
    documentation may change over time. Please refer to the latest official
    documentation and verify all information before making any technical or
    business decisions.
  </div>
</template>

<style src="./ArticleBody.css"></style>
