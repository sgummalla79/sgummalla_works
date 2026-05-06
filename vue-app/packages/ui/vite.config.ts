import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS({
      // In lib mode the consumer app owns the uno.css entry — suppress the warning
      mode: "per-module",
    }),
  ],

  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },

  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "SgwUI",
      fileName: (format) => `sgw-ui.${format === "es" ? "js" : "umd.cjs"}`,
      formats: ["es", "umd"],
    },

    rollupOptions: {
      external: ["vue", "vue-router"],
      output: {
        globals: { vue: "Vue" },
        assetFileNames: "style.css",
      },
    },

    sourcemap: true,
    minify: false,
  },
});
