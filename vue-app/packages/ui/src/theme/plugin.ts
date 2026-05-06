import { inject, ref, watch, type App, type InjectionKey, type Ref } from "vue";
import { cssVarMap, resolveThemeValue, type SgwTheme } from "./tokens";
import { defaultTheme } from "./default";

// ── Injection key ─────────────────────────────────────────────────────────────
export const THEME_KEY: InjectionKey<{
  theme: Ref<SgwTheme>;
  setTheme: (t: SgwTheme) => void;
}> = Symbol("sgw-theme");

// ── Apply theme tokens → CSS custom properties ────────────────────────────────
export function applyTheme(
  theme: SgwTheme,
  target: HTMLElement = document.documentElement,
): void {
  for (const [path, cssVar] of Object.entries(cssVarMap)) {
    const value = resolveThemeValue(theme, path);
    if (value !== "") {
      target.style.setProperty(cssVar, value);
    }
  }
  const isDark = theme.name.toLowerCase().includes("dark");
  target.style.setProperty("color-scheme", isDark ? "dark" : "light");
}

// ── Vue plugin ────────────────────────────────────────────────────────────────
export const ThemePlugin = {
  install(app: App, options: { theme?: SgwTheme } = {}) {
    const theme = ref<SgwTheme>(options.theme ?? defaultTheme);
    applyTheme(theme.value);
    watch(theme, (next) => applyTheme(next), { deep: true });
    app.provide(THEME_KEY, {
      theme,
      setTheme: (next: SgwTheme) => {
        theme.value = next;
      },
    });
  },
};

// ── Composable ────────────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = inject(THEME_KEY);
  if (!ctx) {
    throw new Error(
      "[Sgummalla Works] useTheme() must be called inside a component tree where ThemePlugin is installed.",
    );
  }
  return ctx;
}
