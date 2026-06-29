import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    rollupOptions: {
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
