<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  name?: string;
  email?: string;
  themeMode?: "dark" | "light";
  guest?: boolean;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  profile: [];
  configuration: [];
  "article-drafts": [];
  usage: [];
  logout: [];
  "toggle-theme": [];
  "theme-color": [color: string];
}>();

const THEME_COLORS = [
  { label: "Ember",     value: "#F76300" },
  { label: "Ocean",     value: "#00A1E0" },
  { label: "Violet",    value: "#8B5CF6" },
  { label: "Emerald",   value: "#10B981" },
  { label: "Rose",      value: "#F43F5E" },
  { label: "Slate",     value: "#94A3B8" },
];

function selectColor(color: string) {
  open.value = false;
  emit("theme-color", color);
}

const open = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const isGuest = props.guest || !props.name;

const initials = isGuest
  ? ""
  : (props.name ?? "")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

function toggle() {
  open.value = !open.value;
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener("mousedown", handleClickOutside));
onUnmounted(() =>
  document.removeEventListener("mousedown", handleClickOutside),
);
</script>

<template>
  <div ref="containerRef" class="vz-avatar-wrap">
    <button
      class="vz-avatar-btn"
      :class="{ 'vz-avatar-btn--light': themeMode === 'light' }"
      :aria-expanded="open"
      @click="toggle"
    >
      <!-- Brand icon — inline SVG so CSS color controls fill via currentColor -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 95 95"
        fill="currentColor"
        class="vz-avatar-icon"
        aria-hidden="true"
      >
        <path fill-rule="nonzero" d="M 47.5 13.989 C 35.8311 13.9884 25.4008 21.2672 21.3758 32.22 C 17.3507 43.1727 20.5856 55.4734 29.478 63.029 C 31.9877 65.1011 33.8105 67.8851 34.706 71.014 C 33.8997 71.7151 33.4371 72.7315 33.438 73.8 L 33.438 75.557 C 33.4393 76.8981 34.1663 78.1336 35.338 78.786 L 35.338 79.592 C 35.3415 82.5687 37.5102 85.1004 40.451 85.561 L 40.451 88.487 C 40.4565 91.5302 42.9228 93.9956 45.966 94 L 49.034 94 C 52.0796 93.9967 54.5477 91.5286 54.551 88.483 L 54.551 85.557 C 57.4918 85.0964 59.6605 82.5647 59.664 79.588 L 59.664 78.782 C 60.8357 78.1296 61.5627 76.8941 61.564 75.553 L 61.564 73.8 C 61.5637 72.7329 61.1012 71.7182 60.296 71.018 C 61.1915 67.8891 63.0143 65.1051 65.524 63.033 C 74.4199 55.4778 77.6569 43.1746 73.6309 32.2197 C 69.6049 21.2648 59.1713 13.9856 47.5 13.989 Z M 57.862 72.629 C 58.1721 72.6293 58.4694 72.7529 58.6883 72.9725 C 58.9072 73.1922 59.0298 73.4899 59.029 73.8 L 59.029 75.557 C 59.0284 76.2013 58.5063 76.7234 57.862 76.724 L 37.138 76.724 C 36.4937 76.7234 35.9716 76.2013 35.971 75.557 L 35.971 73.8 C 35.9716 73.1557 36.4937 72.6336 37.138 72.633 Z M 49.034 91.467 L 45.966 91.467 C 44.3189 91.4648 42.9842 90.1301 42.982 88.483 L 42.982 85.629 L 52.018 85.629 L 52.018 88.483 C 52.0158 90.1301 50.6811 91.4648 49.034 91.467 Z M 53.624 83.096 L 41.376 83.096 C 39.4399 83.0932 37.8712 81.5241 37.869 79.588 L 37.869 79.253 L 57.131 79.253 L 57.131 79.588 C 57.131 81.5257 55.5617 83.0972 53.624 83.1 Z M 63.881 61.096 C 61.0484 63.4405 58.9749 66.5726 57.923 70.096 L 37.078 70.096 C 36.0253 66.5727 33.9516 63.4407 31.119 61.096 C 23.035 54.2278 20.0938 43.046 23.7524 33.0892 C 27.411 23.1324 36.8923 16.5151 47.5 16.5151 C 58.1077 16.5151 67.589 23.1324 71.2476 33.0892 C 74.9062 43.046 71.965 54.2278 63.881 61.096 Z M 46.233 8.939 L 46.233 2.267 C 46.233 1.8143 46.4745 1.3961 46.8665 1.1697 C 47.2585 0.9434 47.7415 0.9434 48.1335 1.1697 C 48.5255 1.3961 48.767 1.8143 48.767 2.267 L 48.767 8.939 C 48.767 9.6387 48.1997 10.206 47.5 10.206 C 46.8003 10.206 46.233 9.6387 46.233 8.939 Z M 40.9 43.971 C 40.8969 45.5854 40.231 47.1277 39.058 48.237 C 38.4577 48.5602 37.8543 48.6808 37.8128 48.5521 C 37.3714 48.4233 37.0343 48.0655 36.9322 47.6171 C 36.83 47.1688 36.9788 46.7002 37.321 46.393 C 38.4577 45.3241 38.6969 43.6081 37.896 42.269 C 36.0471 40.2396 36.8192 40.1026 37.3938 39.6389 C 37.9684 39.1752 38.2655 38.4495 38.181 37.716 C 38.1133 37.0278 38.6099 36.4124 39.2969 36.3332 C 39.9839 36.2541 40.6075 36.7404 40.698 37.426 C 40.832 38.5683 40.5389 39.7198 39.875 40.659 C 40.5442 41.6337 40.9017 42.7887 40.9 43.971 Z M 63.849 41.959 C 62.6167 41.9608 61.5007 42.687 61 43.813 L 56.811 43.813 C 56.3673 43.8128 55.956 44.045 55.727 44.425 L 53.332 48.394 L 48.689 48.394 L 48.689 47.306 L 52.938 47.306 C 53.399 47.319 53.8306 47.0804 54.0649 46.6832 C 54.2992 46.2861 54.2992 45.7929 54.0649 45.3958 C 53.8306 44.9986 53.399 44.76 52.938 44.773 L 48.689 44.773 L 48.689 43.564 L 54.809 43.564 C 55.4946 43.5447 56.0404 42.9834 56.0404 42.2975 C 56.0404 41.6116 55.4946 41.0503 54.809 41.031 L 48.689 41.031 L 48.689 40.818 L 55.965 40.818 C 56.5632 42.1654 58.0227 42.9104 59.4648 42.6046 C 60.907 42.2989 61.9385 41.0257 61.9385 39.5515 C 61.9385 38.0773 60.907 36.8041 59.4648 36.4984 C 58.0227 36.1926 56.5632 36.9376 55.965 38.285 L 48.689 38.285 L 48.689 36.441 L 53.226 36.441 C 53.9257 36.441 54.493 35.8737 54.493 35.174 C 54.493 34.4743 53.9257 33.907 53.226 33.907 L 48.689 33.907 L 48.689 32.281 L 53.155 32.281 L 54.155 34.019 C 54.3816 34.412 54.8014 34.6535 55.255 34.652 L 57.724 34.652 C 58.185 34.665 58.6166 34.4264 58.8509 34.0292 C 59.0852 33.6321 59.0852 33.1389 58.8509 32.7418 C 58.6166 32.3446 58.185 32.106 57.724 32.119 L 55.987 32.119 L 54.987 30.381 C 54.7601 29.9883 54.3405 29.7469 53.887 29.748 L 48.687 29.748 L 48.687 28.917 L 57.442 28.917 L 60.442 32.177 C 59.8498 33.5343 60.2888 35.1209 61.4945 35.9807 C 62.7002 36.8405 64.3432 36.7387 65.4336 35.7367 C 66.5239 34.7346 66.7638 33.106 66.0085 31.8321 C 65.2533 30.5583 63.7094 29.9872 62.307 30.463 L 58.931 26.793 C 58.6912 26.533 58.3538 26.3847 58 26.384 L 48.689 26.384 L 48.689 24.884 C 48.6888 24.5727 48.5742 24.2723 48.367 24.04 C 46.567 22.021 44.227 21.287 42.119 22.075 C 41.2375 22.4084 40.4598 22.969 39.865 23.7 C 38.1033 23.2679 36.2432 23.7722 34.941 25.035 C 33.3663 26.6285 32.7126 28.9149 33.207 31.1 C 32.8552 31.4361 32.5781 31.8426 32.394 32.293 C 30.9187 32.8323 29.7373 33.9655 29.137 35.417 C 28.3731 37.1696 28.396 39.1654 29.2 40.9 C 28.7578 41.9727 28.8552 43.1921 29.462 44.181 C 28.9465 45.6751 28.8582 47.2834 29.207 48.825 C 29.6709 51.0045 31.1787 52.8157 33.238 53.667 C 33.6092 54.7676 34.4395 55.653 35.514 56.094 C 35.8468 57.7837 36.7318 59.2612 38.089 60.196 C 39.0854 60.9844 40.3081 61.433 41.578 61.476 C 42.2384 61.4852 42.8885 61.3122 43.457 60.976 C 44.7267 60.5347 46.0733 60.3577 47.414 60.456 C 47.7518 60.4619 48.0771 60.3289 48.314 60.088 C 48.5536 59.8498 48.6882 59.5258 48.688 59.188 L 48.688 57.8 L 54.6 57.8 C 55.0535 57.8009 55.4729 57.5595 55.7 57.167 L 57.365 54.283 L 58.433 54.283 C 59.0312 55.6304 60.4907 56.3754 61.9328 56.0696 C 63.375 55.7639 64.4065 54.4907 64.4065 53.0165 C 64.4065 51.5423 63.375 50.2691 61.9328 49.9634 C 60.4907 49.6576 59.0312 50.4026 58.433 51.75 L 56.633 51.75 C 56.1795 51.7491 55.7601 51.9905 55.533 52.383 L 53.869 55.267 L 48.689 55.267 L 48.689 54.655 L 52.513 54.655 C 52.974 54.668 53.4056 54.4294 53.6399 54.0322 C 53.8742 53.6351 53.8742 53.1419 53.6399 52.7448 C 53.4056 52.3476 52.974 52.109 52.513 52.122 L 48.689 52.122 L 48.689 50.922 L 54.047 50.922 C 54.4909 50.9222 54.9025 50.69 55.132 50.31 L 57.526 46.341 L 61 46.341 C 61.6322 47.7617 63.2143 48.4997 64.7091 48.0712 C 66.2039 47.6427 67.1548 46.1786 66.9382 44.6387 C 66.7217 43.0989 65.404 41.9537 63.849 41.954 Z M 42.145 58.81 C 41.2445 59.0491 40.2845 58.8046 39.608 58.164 C 38.8726 57.6655 38.366 56.8948 38.2 56.022 C 38.9234 55.899 38.7234 55.745 38.957 55.563 C 39.3333 55.2927 39.5319 54.8385 39.4748 54.3787 C 39.4177 53.9189 39.114 53.5271 38.683 53.357 C 38.2521 53.187 37.7626 53.266 37.407 53.563 C 37.2813 53.6645 37.1354 53.7382 36.979 53.779 C 36.6656 53.8014 36.5533 53.7793 36.448 53.737 C 35.9607 53.5119 35.6231 53.0523 35.554 52.52 C 35.4805 52.0599 35.1595 51.6778 34.719 51.526 C 33.3624 51.1264 32.2823 50.0962 31.819 48.76 C 31.5066 47.7797 31.4478 46.7362 31.648 45.727 C 32.6018 45.7674 33.0761 45.6506 33.504 45.429 C 33.9162 45.2285 34.188 44.821 34.2147 44.3634 C 34.2415 43.9058 34.0189 43.4695 33.6328 43.2224 C 33.2468 42.9753 32.7573 42.9561 32.353 43.172 C 32.253 43.224 32.018 43.344 31.732 43.011 C 31.4024 42.6204 31.3766 42.0571 31.669 41.638 C 31.9711 41.2182 31.9877 40.6569 31.711 40.22 C 31.0112 39.0777 30.9159 37.6649 31.456 36.439 C 31.6675 35.9391 31.9957 35.4971 32.413 35.15 C 32.6003 35.5977 32.8809 36.0003 33.236 36.331 C 33.7526 36.79 34.5417 36.7504 35.0097 36.242 C 35.4777 35.7336 35.452 34.9439 34.952 34.467 C 34.7092 34.2165 34.6016 33.8645 34.663 33.521 C 35.7613 32.5695 36.0806 31.8712 35.861 31.233 C 35.2877 29.7383 35.6108 28.0479 36.695 26.87 C 37.5803 26.052 38.8751 25.857 39.962 26.378 C 40.5965 26.6257 41.3132 26.327 41.584 25.702 C 41.889 25.1262 42.3951 24.6827 43.006 24.456 C 44.1504 24.1217 45.3843 24.4924 46.155 25.402 L 46.155 28.25 C 45.9227 27.8847 45.5199 27.6634 45.087 27.663 C 44.7511 27.6638 44.4292 27.7981 44.1923 28.0363 C 43.9554 28.2745 43.8229 28.5971 43.824 28.933 C 43.8529 30.0615 43.4286 31.1545 42.646 31.968 C 41.6568 31.6847 40.5951 31.8131 39.702 32.324 C 39.0945 32.6703 38.8827 33.4435 39.229 34.051 C 39.5753 34.6585 40.3485 34.8703 40.956 34.524 C 41.3605 34.3003 41.8515 34.3003 42.256 34.524 L 42.307 34.552 C 42.5661 34.6976 42.7896 34.8992 42.961 35.142 C 43.2217 35.5199 43.6665 35.7272 44.1236 35.6839 C 44.5807 35.6405 44.9785 35.3532 45.1635 34.933 C 45.3485 34.5128 45.2917 34.0254 45.015 33.659 C 44.945 33.559 44.871 33.47 44.795 33.381 C 45.4583 32.5897 45.9262 31.6535 46.161 30.648 L 46.161 43.12 C 46.007 45.082 45.797 47.637 44.506 49.32 C 43.7 48.5911 42.7243 48.0754 41.668 47.82 C 40.9949 47.6736 40.3282 48.0918 40.1669 48.7615 C 40.0057 49.4312 40.409 50.107 41.075 50.283 C 43.0353 50.7593 44.3404 52.6129 44.128 54.619 C 44.0733 55.1237 44.3253 55.6122 44.7683 55.8602 C 45.2112 56.1081 45.7594 56.0675 46.161 55.757 L 46.161 57.946 C 44.7753 57.9372 43.4045 58.2321 42.145 58.81 Z"/>
      </svg>
    </button>

    <transition name="vz-dropdown">
      <div v-if="open" class="vz-avatar-dropdown">
        <!-- Authenticated: user info header + profile + theme + logout -->
        <template v-if="!isGuest">
          <div class="vz-avatar-header">
            <div class="vz-avatar-header__initials">{{ initials }}</div>
            <div class="vz-avatar-header__info">
              <div class="vz-avatar-header__name">{{ name }}</div>
              <div class="vz-avatar-header__email">{{ email }}</div>
            </div>
          </div>
          <div class="vz-avatar-divider" />

          <button
            class="vz-avatar-item"
            @click="
              () => {
                open = false;
                $emit('profile');
              }
            "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Profile
          </button>

          <button
            v-if="props.isOwner"
            class="vz-avatar-item"
            @click="
              () => {
                open = false;
                $emit('article-drafts');
              }
            "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Article Drafts
          </button>

          <button
            class="vz-avatar-item"
            @click="
              () => {
                open = false;
                $emit('configuration');
              }
            "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
            Configuration
          </button>
        </template>

        <!-- Theme color picker -->
        <div class="vz-avatar-color-wrap">
          <button class="vz-avatar-item vz-avatar-item--color">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            Theme Color
            <span class="vz-avatar-item__spacer" />
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div class="vz-avatar-color-panel">
            <div class="vz-avatar-color-inner">
              <button
                v-for="c in THEME_COLORS"
                :key="c.value"
                class="vz-color-swatch"
                :title="c.label"
                :style="{ background: c.value }"
                @click.stop="selectColor(c.value)"
              />
            </div>
          </div>
        </div>

        <!-- Theme toggle — always shown -->
        <button
          v-if="themeMode !== undefined"
          class="vz-avatar-item vz-avatar-item--theme"
          @click="
            () => {
              open = false;
              $emit('toggle-theme');
            }
          "
        >
          <svg
            v-if="themeMode === 'dark'"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            v-else
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
          <span class="vz-avatar-item__label">
            {{ themeMode === "dark" ? "Switch to Light" : "Switch to Dark" }}
          </span>
          <span class="vz-avatar-item__badge">
            {{ themeMode === "dark" ? "Dark" : "Light" }}
          </span>
        </button>

        <!-- Usage dashboard — owner only -->
        <button
          v-if="props.isOwner"
          class="vz-avatar-item"
          @click="
            () => {
              open = false;
              $emit('usage');
            }
          "
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
            <path d="M7 8h2v5H7zM11 10h2v3h-2zM15 7h2v6h-2z" />
          </svg>
          Usage Dashboard
        </button>

        <!-- Authenticated: logout -->
        <template v-if="!isGuest">
          <div class="vz-avatar-divider" />
          <button
            class="vz-avatar-item"
            @click="
              () => {
                open = false;
                $emit('logout');
              }
            "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </template>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.vz-avatar-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.vz-avatar-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--vz-orange-dim);
  border: 1.5px solid var(--vz-orange);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.vz-avatar-btn:hover {
  border-color: var(--vz-orange);
  background: var(--vz-orange-dim);
}

.vz-avatar-btn--light {
  background: var(--vz-orange);
}
.vz-avatar-btn--light:hover {
  background: var(--vz-orange);
  opacity: 0.88;
}

.vz-avatar-icon {
  width: 22px;
  height: 22px;
  display: block;
  flex-shrink: 0;
  color: #fff;
}

/* Dropdown */
.vz-avatar-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 220px;
  background: var(--vz-bg2);
  border: 1px solid var(--vz-border2);
  border-radius: var(--vz-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  z-index: 100;
}

.vz-avatar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  background: var(--vz-surface);
}

.vz-avatar-header__initials {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--vz-text);
  flex-shrink: 0;
}

.vz-avatar-header__name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vz-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vz-avatar-header__email {
  font-family: var(--vz-font-mono);
  font-size: 0.7rem;
  color: var(--vz-text3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vz-avatar-divider {
  height: 1px;
  background: var(--vz-border);
}

.vz-avatar-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-family: var(--vz-font-sans);
  color: var(--vz-text2);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.12s,
    color 0.12s;
}

.vz-avatar-item:hover {
  background: var(--vz-orange);
  color: #fff;
}

.vz-avatar-item--danger:hover {
  color: var(--vz-red);
  background: var(--vz-red-dim);
}

.vz-avatar-item__label {
  flex: 1;
}

.vz-avatar-item__badge {
  font-family: var(--vz-font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vz-text3);
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border);
  border-radius: 4px;
  padding: 0.1em 0.45em;
  line-height: 1.6;
}

.vz-avatar-item--theme:hover .vz-avatar-item__badge {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

/* ── Theme color picker ── */
.vz-avatar-color-wrap {
  position: relative;
}

.vz-avatar-item--color {
  width: 100%;
}

.vz-avatar-item__spacer {
  flex: 1;
}

.vz-avatar-color-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease;
  background: var(--vz-surface);
  border-top: 0px solid var(--vz-border);
}

.vz-avatar-color-wrap:hover .vz-avatar-color-panel {
  max-height: 56px;
  border-top-width: 1px;
}

.vz-avatar-color-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.6rem 1rem;
}

.vz-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  outline: none;
}

.vz-color-swatch:hover {
  transform: scale(1.25);
  box-shadow: 0 0 0 2px var(--vz-bg2), 0 0 0 4px rgba(255, 255, 255, 0.4);
}

/* Transition */
.vz-dropdown-enter-active,
.vz-dropdown-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.vz-dropdown-enter-from,
.vz-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
