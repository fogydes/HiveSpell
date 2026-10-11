import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Specs live in `e2e/` as `*.spec.ts`. Vitest deliberately excludes `e2e/**`
 * and reserves `*.spec.ts` for Playwright (see vitest.config.ts), so the two
 * runners never pick up each other's files.
 *
 * Notes:
 * - The app is a Vite SPA served on :3000 (see vite.config.ts). We drive tests
 *   against `npm run dev` and reuse an already-running server locally.
 * - Service workers are BLOCKED: the PWA plugin registers one in dev
 *   (vite.config.ts `devOptions.enabled`), which otherwise caches assets across
 *   runs and is a classic source of E2E flakiness.
 * - `reducedMotion: 'reduce'` makes the decorative Three.js scene render `null`
 *   (SceneCanvasLayer bails on reduced motion) and disables GSAP animations —
 *   the single biggest stability lever. The SwiftShader launch arg remains as
 *   defence-in-depth for any residual WebGL.
 * - `locale: 'en-US'` pins language detection to English; the app supports
 *   en/es/fr/ar and would otherwise follow the CI browser's navigator.language,
 *   breaking English string assertions (and flipping to RTL for ar).
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    serviceWorkers: "block",
    locale: "en-US",
    // In @playwright/test 1.62, reducedMotion is not a top-level `use` key; it is
    // set through the browser context options. This emulates
    // `prefers-reduced-motion: reduce`, which makes the decorative Three.js scene
    // render `null` (SceneCanvasLayer bails) and disables GSAP — the single
    // biggest stability lever for the lobby/shop specs.
    contextOptions: { reducedMotion: "reduce" },
    launchOptions: {
      // Permit the WebGL → SwiftShader fallback used by the background scene.
      args: ["--enable-unsafe-swiftshader"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    // Enable the AuthContext E2E seam (see context/AuthContext.tsx). The seam is
    // dormant unless a spec injects `window.__E2E_AUTH__`, so logged-out specs
    // still exercise the real Firebase/redirect path. Vite exposes VITE_-prefixed
    // process env vars to `import.meta.env`, matching how CI injects VITE_FIREBASE_*.
    env: { VITE_E2E: "true" },
  },
});
