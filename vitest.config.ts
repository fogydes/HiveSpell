/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Reuse the app's Vite config (path aliases, plugins) so tests resolve `@/`
// imports exactly like the build does, then layer the test-runner settings on
// top.
//
// Notes:
// - The default environment is `node` (fast) for the pure util/data suites;
//   React hook/component tests opt into jsdom per-file with a
//   `// @vitest-environment jsdom` docblock, so DOM libs never load for node
//   suites.
// - No `setupFiles` for DOM cleanup: with `globals: true`, `@testing-library/
//   react` (v16) auto-registers `cleanup()` in an `afterEach` the moment it is
//   imported by a test file, so a custom setup file is redundant.
// - `include` covers `*.test.ts(x)`; `*.spec.ts` is reserved for Playwright
//   end-to-end tests, which Vitest must not pick up (also excluded via e2e/**).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "node",
      include: ["**/*.test.ts", "**/*.test.tsx"],
      exclude: ["node_modules", "dist", "dev-dist", "e2e/**"],
    },
  }),
);
