#!/usr/bin/env node
/**
 * Fail-fast env validation for local development.
 *
 * Wired to the `predev` npm hook so `npm run dev` refuses to start against a
 * half-configured `.env.local` (the #1 "why is auth/multiplayer broken?"
 * time-sink). It only guards the dev server — `build`/`test`/`test:e2e` are
 * intentionally untouched so CI and unit tests keep running with mocked config.
 *
 * Values are resolved from `process.env` first (so CI secrets and shell exports
 * win), then from a `.env.local` file in the repo root. A key counts as "set"
 * only if it is present, non-empty, and not left as a copied-in template
 * placeholder (`your_...`, `placeholder`, or the firebase.ts test fallbacks).
 *
 * Dependency-free on purpose — this runs before Vite and must not pull anything
 * from the graph it is meant to protect.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Client keys the app genuinely needs to reach a real backend. Firebase RTDB
// (databaseURL) powers multiplayer; Supabase powers leaderboards/social — a
// build without these silently degrades, so treat them as hard requirements.
const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

// Present-but-optional: analytics, feature flags, build-injected metadata.
// Missing ones are surfaced as a hint, never a failure.
const OPTIONAL = [
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_ENABLE_DISCORD_LOGIN",
  "VITE_POSTHOG_API_KEY",
  "VITE_POSTHOG_HOST",
  "VITE_APP_VERSION",
];

const PLACEHOLDER = /your[-_]|placeholder|test-api-key|test-project|test\.firebaseapp\.com/i;

/** Minimal dotenv parser: `KEY=VALUE`, `#` comments, optional quotes, no interpolation. */
function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

// CI and E2E pipelines manage configuration themselves (GitHub secrets, plus the
// VITE_E2E auth seam) and must not be gated by a local-dev convenience check —
// Playwright's webServer runs `npm run dev`, which would otherwise trip this.
if (process.env.CI || process.env.VITE_E2E) {
  console.log("✓ check-env: skipped (CI/E2E manages its own configuration).");
  process.exit(0);
}

const envLocalPath = resolve(process.cwd(), ".env.local");
const fileEnv = parseEnvFile(envLocalPath);
const resolveKey = (key) => process.env[key] ?? fileEnv[key];

const isSet = (value) =>
  typeof value === "string" && value.trim() !== "" && !PLACEHOLDER.test(value);

const missing = REQUIRED.filter((key) => !isSet(resolveKey(key)));
const missingOptional = OPTIONAL.filter((key) => !isSet(resolveKey(key)));

if (missingOptional.length > 0) {
  console.warn(
    `\x1b[33m⚠ Optional env not set (features degrade gracefully): ${missingOptional.join(", ")}\x1b[0m`,
  );
}

if (missing.length > 0) {
  const source = existsSync(envLocalPath) ? ".env.local" : "your environment";
  console.error("\x1b[31m✗ Missing required environment variables:\x1b[0m");
  for (const key of missing) console.error(`\x1b[31m  • ${key}\x1b[0m`);
  console.error(
    `\nPopulate them in ${source}. If you haven't yet, copy the template:\n` +
      "  cp .env.template .env.local\n" +
      "then fill in your Firebase + Supabase project values.\n",
  );
  process.exit(1);
}

console.log("\x1b[32m✓ Environment looks good — all required keys present.\x1b[0m");
