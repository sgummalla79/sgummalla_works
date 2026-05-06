import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";

export default defineConfig({
  plugins: [vue(), UnoCSS()],

  resolve: {
    alias: {
      "@sgw/ui": resolve(__dirname, "../packages/ui/src/index.ts"),
      "@": resolve(__dirname, "src"),
    },
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      // vue-router is provided by the app — treat as external when bundling @sgw/ui source
      external: [],
    },
  },
});
