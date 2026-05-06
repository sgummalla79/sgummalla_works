<script setup lang="ts">
import { ref, nextTick, onMounted, inject } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "../theme/plugin";
import { defaultTheme, lightTheme } from "../theme/default";
import NavBar from "../components/NavBar.vue";
import NavLink from "../components/NavLink.vue";
import NavGroup from "../components/NavGroup.vue";
import NavAvatar from "../components/NavAvatar.vue";
import NavLogo from "../components/NavLogo.vue";
import SymbolLayer from "../components/SymbolLayer.vue";
import lightbulbRaw from "../assets/lightbulb.svg?raw";

// ── Nav tiers — single source of truth ───────────────────────────────────────
// Add / remove items here only. No view should build its own nav list.

const DEMOS_NAV = [
  { name: "auths", label: "Integrations", href: "/auths" },
  {
    name: "salesforce",
    label: "JWT Bearer Auth",
    href: "/salesforce/jwtbearer",
  },
  {
    name: "salesforce-exchange",
    label: "Token Exchange Auth",
    href: "/salesforce/token-exchange",
  },
];

withDefaults(
  defineProps<{
    brand?: string;
    scrollable?: boolean;
    userName?: string;
    userEmail?: string;
    activePage?: string;
    isOwner?: boolean;
    isAuthenticated?: boolean;
    navLinks?: Array<{ name: string; label: string; href: string }>;
  }>(),
  {
    brand: "Sgummalla Works",
    scrollable: false,
    activePage: "",
    isOwner: false,
    isAuthenticated: false,
  },
);

const emit = defineEmits<{
  logout: [];
  profile: [];
  usage: [];
}>();

const router = useRouter();

function handleProfile() {
  emit("profile");
  router.push("/profile");
}

function handleConfiguration() {
  router.push("/configuration");
}

function handleArticleDrafts() {
  router.push("/drafts");
}

const { setTheme } = useTheme();
const THEME_STORAGE_KEY = "sgw-theme-mode";
const themeMode = ref<"dark" | "light">(
  (localStorage.getItem(THEME_STORAGE_KEY) as "dark" | "light") ?? "dark",
);

const ACCENT_COOKIE = "sgw-accent-color";

function setCookie(value: string) {
  const exp = new Date(Date.now() + 365 * 864e5).toUTCString();
  document.cookie = `${ACCENT_COOKIE}=${encodeURIComponent(value)};expires=${exp};path=/;SameSite=Lax`;
}

function getCookie(): string | null {
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + ACCENT_COOKIE + "=([^;]*)"),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

const loadAccentColor = inject<() => Promise<string | null>>(
  "loadAccentColor",
  async () => null,
);
const saveAccentColor = inject<(color: string) => Promise<void>>(
  "saveAccentColor",
  async () => {},
);

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function updateFavicon(color: string) {
  const svg = lightbulbRaw.replace('fill="currentColor"', `fill="${color}"`);
  const link = document.querySelector(
    'link[type="image/svg+xml"]',
  ) as HTMLLinkElement | null;
  if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function applyAccentColor(color: string) {
  document.documentElement.style.setProperty("--vz-orange", color);
  document.documentElement.style.setProperty(
    "--vz-orange-dim",
    hexToRgba(color, 0.14),
  );
  updateFavicon(color);
}

async function applyTheme(mode: "dark" | "light") {
  const theme = mode === "light" ? lightTheme : defaultTheme;
  setTheme(theme);
  await nextTick();
  const saved = getCookie();
  applyAccentColor(saved ?? theme.colors.orange);
}

applyTheme(themeMode.value);

onMounted(async () => {
  const serverColor = await loadAccentColor();
  if (serverColor) {
    setCookie(serverColor);
    applyAccentColor(serverColor);
  }
});

function toggleTheme() {
  themeMode.value = themeMode.value === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, themeMode.value);
  applyTheme(themeMode.value);
}

async function handleThemeColor(color: string) {
  setCookie(color);
  applyAccentColor(color);
  await saveAccentColor(color);
}
</script>

<template>
  <div class="vz-shell" :class="{ 'vz-shell--scrollable': scrollable }">
    <SymbolLayer />

    <NavBar>
      <template #brand>
        <div class="vz-nav-brand-inner">
          <NavLogo />
          <span class="vz-nav-slogan"
            >Ideas in Motion, Think. Build. Demo.</span
          >
        </div>
      </template>
      <template #links>
        <!-- Demos dropdown — owner only -->
        <NavGroup
          v-if="isAuthenticated"
          label="Demos"
          :active="DEMOS_NAV.some((d) => d.name === activePage)"
        >
          <template #icon>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </template>
          <NavLink href="/auths" :active="activePage === 'auths'">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
              />
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              />
            </svg>
            Integrations
          </NavLink>
          <NavLink
            href="/salesforce/jwtbearer"
            :active="activePage === 'salesforce'"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m21 2-9.6 9.6" />
              <path d="m15.5 7.5 3 3L22 7l-3-3" />
            </svg>
            JWT Bearer Auth
          </NavLink>
          <NavLink
            href="/salesforce/token-exchange"
            :active="activePage === 'salesforce-exchange'"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            Token Exchange Auth
          </NavLink>
        </NavGroup>

        <!-- Blog — everyone -->
        <NavLink href="/blog" :active="activePage === 'blog'">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"
            />
          </svg>
          Blog
        </NavLink>
      </template>

      <template #right>
        <a
          v-if="!userName && router.currentRoute.value.path !== '/login'"
          href="/login"
          class="vz-nav-signin"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10,17 15,12 10,7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Sign In
        </a>
        <NavAvatar
          v-bind="
            userName && userEmail ? { name: userName, email: userEmail } : {}
          "
          :guest="!userName"
          :theme-mode="themeMode"
          :is-owner="!!isOwner"
          @profile="handleProfile"
          @configuration="handleConfiguration"
          @article-drafts="handleArticleDrafts"
          @logout="emit('logout')"
          @toggle-theme="toggleTheme"
          @theme-color="handleThemeColor"
          @usage="emit('usage')"
        />
      </template>
    </NavBar>

    <div class="vz-shell__body">
      <main class="vz-shell__main">
        <slot />
      </main>
    </div>

    <footer class="vz-shell__footer">
      <slot name="footer">
        <div class="vz-shell__footer-right">
          <span class="vz-shell__footer-dot" />
          Live
        </div>
        <span class="vz-shell__footer-tagline"
          >Ideas in Motion, Think. Build. Demo.</span
        >
      </slot>
    </footer>
  </div>
</template>

<style scoped>
.vz-nav-brand-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
}

.vz-nav-signin {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-sans);
  font-size: 0.825rem;
  font-weight: 500;
  color: var(--vz-orange);
  text-decoration: none;
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--vz-orange);
  border-radius: var(--vz-radius-md);
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
  white-space: nowrap;
}

.vz-nav-signin:hover {
  color: #fff;
  background: var(--vz-orange);
  border-color: var(--vz-orange);
}

.vz-nav-slogan {
  font-family: var(--vz-font-sans);
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--vz-text3);
  white-space: nowrap;
}

.vz-shell {
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--vz-bg, #0c0c0c);
  position: relative;
  overflow: hidden;
}

.vz-shell__body {
  display: flex;
  flex-direction: row;
  overflow: hidden;
  z-index: 1;
  min-height: 0;
}

.vz-shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
  box-sizing: border-box;
}

.vz-shell--scrollable .vz-shell__main {
  align-items: flex-start;
  padding: 3rem 2rem 4rem;
  overflow-y: auto;
}

.vz-shell__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 2rem;
  border-top: 1px solid var(--vz-border, rgba(255, 255, 255, 0.08));
}

.vz-shell__footer-left {
  font-family: var(--vz-font-mono, monospace);
  font-size: 0.69rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3, rgba(255, 255, 255, 0.3));
}

.vz-shell__footer-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-mono, monospace);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3, rgba(255, 255, 255, 0.3));
}

.vz-shell__footer-tagline {
  font-family: var(--vz-font-mono, monospace);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3, rgba(255, 255, 255, 0.3));
}

.vz-shell__footer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vz-orange, #f76300);
  animation: vz-pulse 2.5s ease-in-out infinite;
}

@keyframes vz-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

@media (max-width: 680px) {
  .vz-shell {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  .vz-shell__main {
    padding: 1.75rem 1.25rem;
    align-items: flex-start;
  }
  .vz-shell__footer {
    padding: 0.85rem 1.25rem;
  }
}
</style>
