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
  "joinha-loja-icon-v9-192.png",
  "joinha-loja-icon-v9-512.png",
  "joinha-loja-icon-v9-1024.png",
  "joinha-staff-icon-v9-192.png",
  "joinha-staff-icon-v9-512.png",
  "joinha-staff-icon-v9-1024.png",
  "manifest-loja.webmanifest",
  "manifest-staff.webmanifest",
  "OneSignalSDKWorker.js",
  "robots.txt"
],
      manifest: false,
      workbox: {
        navigateFallback: "/index.html",
        cacheId: "joinha-pwa-v9",
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


