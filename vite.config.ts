import { defineConfig } from "vite";
import { seoHead, SITE } from "./lib/site.mjs";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  define: { __CHATPTT_SITE_ORIGIN__: JSON.stringify(SITE.origin) },
  plugins: [react(), { name: "chatptt-metadata", transformIndexHtml: { order: "pre", handler: (html) => html.replace("<!-- site metadata -->", seoHead()) } }],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: { outDir: "dist/client", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8892" },
  },
});
