// i18next-parser config — used ONLY by `npm run i18n:check` (CI gate #41).
// It extracts every key referenced in source via t()/<Trans> into a throwaway
// temp catalog (.i18n-tmp/), which scripts/check-i18n.mjs then diffs against the
// committed catalogs in public/locales/. It deliberately does NOT write to
// public/locales/ — the real catalogs are hand-maintained and fully translated.
//
// NOTE on namespaces: components call useTranslation("friends"|"chat"|...) but
// i18n.ts's loadPath has no {{ns}}, so every namespace resolves against the same
// en.json and all t() calls use the full dotted path (e.g. t("friends.viewProfile")).
// The parser still buckets keys by the detected namespace; check-i18n.mjs merges
// every namespace file back together and flattens, so the bucketing is irrelevant.
export default {
  locales: ["en"],
  output: ".i18n-tmp/$LOCALE/$NAMESPACE.json",
  input: [
    "**/*.{ts,tsx}",
    "!**/node_modules/**",
    "!dist/**",
    "!coverage/**",
    "!e2e/**",
    "!**/*.test.{ts,tsx}",
    "!**/*.spec.{ts,tsx}",
    "!**/*.d.ts",
    "!scripts/**",
    "!*.config.{ts,js}",
  ],
  defaultNamespace: "translation",
  keySeparator: ".",
  namespaceSeparator: ":",
  createOldCatalogs: false,
  keepRemoved: false,
  sort: true,
  defaultValue: "",
  lexers: {
    ts: ["JavascriptLexer"],
    tsx: ["JsxLexer"],
  },
};
