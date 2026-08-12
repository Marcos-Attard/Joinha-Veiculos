import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "joinha-loja-icon-v2.png",
        "joinha-staff-icon-v2.png"
      ],
      manifest: {
        name: "Joinha Veículos",
        short_name: "Joinha",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#081521",
        theme_color: "#081521",
        icons: [
          {
            src: "/joinha-loja-icon-v2.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/joinha-loja-icon-v2.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/joinha-loja-icon-v2.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        cacheId: "joinha-pwa-v2",
        cleanupOutdatedCaches: true
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
