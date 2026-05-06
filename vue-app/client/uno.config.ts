import { defineConfig, presetUno, presetAttributify } from "unocss";

export default defineConfig({
  presets: [presetUno(), presetAttributify()],

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
      "vz-red": "var(--vz-red)",
    },
    fontFamily: {
      sans: "var(--vz-font-sans)",
      mono: "var(--vz-font-mono)",
      display: "var(--vz-font-display)",
    },
  },

  shortcuts: {
    "vz-container": "w-full max-w-860px mx-auto",
  },
});
