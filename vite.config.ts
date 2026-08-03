import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const vendorModules = [
  "react",
  "react-dom",
  "react-router-dom",
  "firebase/app",
  "firebase/auth",
  "firebase/database",
  "@supabase/supabase-js",
];

export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "HiveSpell",
        short_name: "HiveSpell",
        description: "Competitive spelling arena with seasons, cosmetics, and spectacle",
        theme_color: "#1a1a2e",
        background_color: "#0f0f1a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["games", "education"],
        screenshots: [],
        shortcuts: [
          {
            name: "Play Now",
            short_name: "Play",
            description: "Jump into a quick game",
            url: "/play/quick",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Challenges",
            short_name: "Challenges",
            description: "View daily and weekly challenges",
            url: "/challenges",
            icons: [{ src: "/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-storage",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    rollupOptions: {
      external: ["@sentry/react"],
      output: {
        manualChunks(id) {
          return vendorModules.some((moduleId) => id.includes(moduleId))
            ? "vendor"
            : undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
