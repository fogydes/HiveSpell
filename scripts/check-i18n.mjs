#!/usr/bin/env node
/**
 * i18n key gate (transformationV2 spec #41).
 *
 * Runs AFTER i18next-parser has AST-extracted every statically-analyzable t()
 * key into .i18n-tmp/en/<namespace>.json. This script then:
 *
 *   1. Unions all extracted namespace files, flattened from the root, into the
 *      set of USED key-paths. (i18n.ts's http-backend loadPath is
 *      '/locales/{{lng}}.json' with no {{ns}} token, so at runtime the whole of
 *      en.json is the resource for every namespace and every key resolves from
 *      the root — the useTranslation("ns") argument is decorative. We therefore
 *      compare full dotted paths, not per-namespace subsets.)
 *
 *   2. HARD FAIL: any USED key absent from public/locales/en.json. en is the
 *      i18next fallbackLng, so a key missing there renders as the raw key
 *      string for EVERY user. This is the regression gate the spec asks for.
 *
 *   3. WARN (non-blocking): USED keys present in en.json but missing from
 *      es/fr/ar — surfaced as translation debt without blocking, matching this
 *      repo's existing warning-only CI convention (a11y audit, bundle size).
 *
 * Plural keys: i18next-parser expands t(key, { count }) into suffixed variants
 * (_zero/_one/_two/_few/_many/_other); the catalogs store only the base key, so
 * a suffixed USED key is treated as satisfied by its base.
 *
 * Fully dynamic keys — e.g. t(`a.b.${x}`) — are not statically extractable and
 * are intentionally out of scope for this gate.
 */
import fs from "node:fs";
import path from "node:path";

const USED_DIR = path.join(".i18n-tmp", "en");
const LOCALES_DIR = path.join("public", "locales");
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

function loadFlat(file) {
  return flatten(JSON.parse(fs.readFileSync(file, "utf8")), "", new Set());
}

function cleanup() {
  fs.rmSync(".i18n-tmp", { recursive: true, force: true });
}

function fail(msg) {
  console.error(msg);
  cleanup();
  process.exit(1);
}

// 1. USED keys — union of every extracted namespace file, flattened from root.
if (!fs.existsSync(USED_DIR)) {
  fail(`[i18n:check] ERROR: ${USED_DIR} not found — did i18next-parser run?`);
}
const used = new Set();
for (const f of fs.readdirSync(USED_DIR)) {
  if (f.endsWith(".json")) for (const k of loadFlat(path.join(USED_DIR, f))) used.add(k);
}
const usedKeys = [...used].sort();

// 2. Catalogs.
const catalog = (loc) => loadFlat(path.join(LOCALES_DIR, `${loc}.json`));
const en = catalog("en");
const has = (set, key) =>
  set.has(key) || (PLURAL_SUFFIX.test(key) && set.has(key.replace(PLURAL_SUFFIX, "")));

// 3. HARD tier — used keys missing from the fallback locale.
const missingEn = usedKeys.filter((k) => !has(en, k));

// 4. WARN tier — used keys defined in en but missing from other locales.
const warnLocales = ["es", "fr", "ar"];
const warnings = warnLocales.map((loc) => [
  loc,
  usedKeys.filter((k) => has(en, k) && !has(catalog(loc), k)),
]);

// 5. Report.
console.log(
  `[i18n:check] ${usedKeys.length} statically-extracted t() keys checked against en.json.`
);
for (const [loc, miss] of warnings) {
  if (miss.length) {
    const sample = miss.slice(0, 5).join(", ");
    console.warn(
      `[i18n:check] WARN (non-blocking): ${miss.length} used key(s) present in en.json but missing from ${loc}.json — e.g. ${sample}${miss.length > 5 ? " …" : ""}`
    );
  }
}

if (missingEn.length) {
  fail(
    `\n[i18n:check] FAIL: ${missingEn.length} used key(s) missing from en.json ` +
      `(the fallback locale — these render as the raw key for ALL users):\n` +
      missingEn.map((k) => `  - ${k}`).join("\n")
  );
}

cleanup();
console.log("[i18n:check] PASS — every statically-extracted t() key is defined in en.json.");
