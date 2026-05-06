import { defineConfig, presetUno, presetAttributify } from "unocss";

export default defineConfig({
  presets: [presetUno(), presetAttributify()],

  // Map Sgummalla Works CSS vars to UnoCSS theme so `text-vz-text` etc. work
  theme: {
    colors: {
      "vz-bg": "var(--vz-bg)",
      "vz-bg2": "var(--vz-bg2)",
      "vz-surface": "var(--vz-surface)",
      "vz-surface2": "var(--vz-surface2)",
      "vz-border": "var(--vz-border)",
      "vz-border2": "var(--vz-border2)",
      "vz-text": "var(--vz-text)",
      "vz-text2": "var(--vz-text2)",
      "vz-text3": "var(--vz-text3)",
      "vz-green": "var(--vz-green)",
      "vz-green-dim": "var(--vz-green-dim)",
      "vz-red": "var(--vz-red)",
      "vz-red-dim": "var(--vz-red-dim)",
    },
    fontFamily: {
      sans: "var(--vz-font-sans)",
      mono: "var(--vz-font-mono)",
      display: "var(--vz-font-display)",
    },
    borderRadius: {
      sm: "var(--vz-radius-sm)",
      md: "var(--vz-radius-md)",
      lg: "var(--vz-radius-lg)",
    },
  },

  // Reusable shortcuts matching the Sgummalla Works component patterns
  shortcuts: {
    // Layout
    "vz-shell": "h-screen grid relative overflow-hidden bg-vz-bg",

    // Typography
    "vz-eyebrow": "font-mono text-xs tracking-widest uppercase text-vz-text2",
    "vz-label": "font-mono text-xs tracking-wide text-vz-text3",

    // Nav
    "vz-nav":
      "relative z-10 grid items-center border-b border-vz-border bg-[var(--vz-nav-bg)] backdrop-blur-md",
    "vz-nav-brand":
      "font-mono text-sm font-bold tracking-widest uppercase text-vz-text no-underline flex items-center gap-2 transition-opacity hover:opacity-75",
    "vz-nav-link":
      "inline-flex items-center h-full px-4 text-sm font-medium text-vz-text2 no-underline tracking-wide transition-colors hover:text-vz-text",

    // Buttons
    "vz-btn-primary":
      "w-full py-3 bg-vz-text text-vz-bg font-semibold rounded-md border-none cursor-pointer transition-opacity hover:opacity-90",
    "vz-btn-ghost":
      "py-2 px-4 bg-transparent border border-vz-border2 text-vz-text2 rounded-md cursor-pointer transition-colors hover:border-vz-text hover:bg-vz-surface",

    // Inputs
    "vz-input":
      "w-full bg-vz-surface border border-vz-border2 rounded-md px-4 py-3 text-vz-text outline-none transition-colors focus:border-vz-text2",

    // Status dots
    "vz-dot": "w-1.5 h-1.5 rounded-full flex-shrink-0",
    "vz-dot-green": "vz-dot bg-vz-green",
    "vz-dot-red": "vz-dot bg-vz-red",

    // Symbol backgrounds
    "vz-symbol":
      "absolute pointer-events-none select-none z-0 font-display leading-none",
  },

  // Safelist symbol and dot classes so they aren't purged
  safelist: ["vz-dot-green", "vz-dot-red", "vz-symbol", "animate-pulse"],
});
