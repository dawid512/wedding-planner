import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    // Prefer .tsx/.ts over .jsx/.js so migrated files take precedence
    extensions: [".mjs", ".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        mobilePreview: resolve(rootDir, "mobile-preview.html"),
      },
    },
  },
});
