# HiveSpell Transformation V2 — The Honest Take

**Date:** Last updated: 2026-08-17  
**Status:** Live audit complete — bugs fixed. Animation stack: **GSAP + Three.js** (switched from Framer Motion on 2026-08-12; see §0 Library decision). GameplayStage migration to GSAP complete (verified 2026-08-17); `framer-motion` removed from `package.json`.

---

## 0. Session Log — 2026-08-07 (Live Dev Audit)

### What was fixed in this session

| Item | Status | Details |
|------|--------|---------|
| `header.stash` missing from `en.json` | ✅ FIXED | Added `"stash": "Stash"` to `header` section |
| `common.notifications` wrong key path | ✅ FIXED | Key lives at `nav.notifications`; fixed `NotificationBell.tsx:170` |
| ~~Framer Motion installed~~ → **Switched to GSAP + Three.js** | ✅ DONE | Full switch to GSAP complete. `framer-motion` no longer in `package.json`; no runtime imports remain (verified 2026-08-17). |
| `GameplayStage.tsx` — animation migration + `feedbackType` prop | ✅ DONE | GSAP (`gsap` + `useGSAP`) drives input shake, definition fade, streak pop, timer bar. `feedbackType` prop wired from `Play.tsx`. Verified 2026-08-17. |

### New bugs found from live dev server tour

**Bug: Leaderboard stat columns all show 0** (`views/Leaderboards.tsx`, `useLeaderboards` hook)
- Live observation: `fogydes` shows `★ 0  ✓ 0  🍯 0  🔥 0  2.0K` — composite score renders correctly but `gamesWon`, `totalCorrectWords`, `nectar`, `maxStreak` are all zero for every user
- The account has 32 wins and 1,598 corrects (confirmed visible on Home page), so the data exists in Supabase
- Root cause: the Supabase leaderboard RPC/view returns `composite_score` from one column but the per-stat fields (`games_won`, `total_correct_words`, etc.) are either not selected in the query or not mapped in `useLeaderboards`
- Fix: audit `useLeaderboards.ts` — check what the RPC returns vs what the hook maps, and whether field names match the Supabase view column names

**Bug: i18n race on initial render** (observed pattern)
- Some translation keys resolve fine (`common.settings` → "Settings") while others show raw on first render
- This is a known pattern when `useSuspense: false` and the backend loads async — components render before translations arrive
- Fix candidate: add `i18n.isInitialized` check in the root or wrap with a thin loading gate

### Key insight from live tour: the resting state problem

The theater components (`VictorySequence`, `SuccessTheater`, `FailureTheater`, etc.) already fire with real animation — confetti canvas, glow effects, keyframe sequences. They look good. But they're full-screen overlays that appear for 5 seconds and then disappear. Between those moments, the game screen is bare: a definition in italics, a flat progress bar, a circular speaker button, and a text input with a `border-b-2`. There is no sustained visual interest. Users spend most of their time in the resting state, not the theater moments.

**The fix is not more theater components. The fix is making the _resting state_ feel alive.**

### Library decision (REVISED 2026-08-12)

**Stack: GSAP + Three.js.** This replaces the earlier "Framer Motion only" call. `framer-motion@13.0.0` will be uninstalled once `GameplayStage.tsx` (the only runtime file importing it) is migrated to GSAP.

Rationale for the reversal:
- **One animation library, not two.** GSAP covers the micro-interaction layer (input feedback, number changes, word/definition transitions, timer bar) that Framer Motion was chosen for — with `gsap.context()` + the `@gsap/react` `useGSAP` hook giving clean React lifecycle scoping and automatic cleanup. GSAP is now fully free (all former Club plugins included since the Webflow acquisition / GSAP 3.13), so there is no licensing reason to keep Framer Motion.
- **Three.js unlocks the real goal: per-theme animated scenes.** Each visual theme should get its own unique animated ambient scene (backgrounds + hero moments like victory / tier-reveal / battle-pass unlock), driven by GSAP timelines over a Three.js (WebGL) layer. This is the headline feature the stack is being adopted for — not just micro-interactions.

**Bundle discipline:** Three.js and per-theme scene modules MUST be lazy-loaded / code-split (dynamic `import()` behind the existing `SceneContext` performance tiers), never in the main bundle. The `performanceTier === "static"` / `useReduceMotion()` paths must fully bypass the WebGL layer and fall back to the current hand-written canvas effects.

Specific GSAP uses (micro-interaction layer):
- `GameplayStage`: input shake on wrong answer, definition fade on new word, streak pop, smooth timer bar
- `Lobby`: difficulty card lift on hover, stagger cards in on mount
- `Leaderboards`: stagger rows on load, "your rank" pin animation
- `StashModal`: item card equip pop, rarity badge entrance
- `Home`: stat number count-up on mount

Per-theme animated scenes (GSAP + Three.js, lazy-loaded) — extends the existing `components/scene/`, `context/SceneContext.tsx`, and `data/themes/sceneSpecs.ts` + `scenePackages.ts` infrastructure:
- Each theme in `data/themes/` gets a unique WebGL ambient scene + GSAP-timed hero moments
- Reuses `SceneContext` performance tiers for graceful degradation to the current hand-written canvas fallbacks

### Screen-by-screen live findings (added to existing notes)

**Play view — resting state detail:**
- Word is heard via TTS, not seen. The "word area" is a circular speaker button. Nothing communicates what word was just spoken after the audio plays — no visual echo, no waveform, nothing.
- The input is `border-b-2 border-primary` — a single underline. No background, no border-radius, no visual affordance beyond the line.
- The timer is `h-2` to `h-3` flat bar with inline color change. No count-down tension beyond the number.
- "🔊 Listen to the word..." with `animate-pulse` is the speaking indicator — just pulsing text.
- STREAK > 5 triggers `animate-pulse` on the number. That's the only reactivity in the resting state.

**Lobby — found issues:**
- `getModeColor()` uses hardcoded inline color strings (`text-cyan-400 border-cyan-500/30`) per mode — inconsistent with the theme system. If the user switches themes, these colors don't adapt.
- Friends panel is embedded inline — works but adds visual weight to what should be a quick "pick a mode and play" screen.

**Auth view:**
- Completely blank dark background, no scene, no ambient effects. First impression for new players is a plain form.
- Title says `Log in or Sign up` / `Sign up or Log in` simultaneously — the heading renders both states at once which reads oddly.
- No social login (Google/Discord) — adds friction for casual players.

**Header:**
- `fetchLeaderboard()` in Header still present (noted in Section 2 below, but confirming it was observed live). The header leaderboard modal shows different data from the `/leaderboards` route.

---



HiveSpell is a React 19 + Firebase + Supabase multiplayer spelling game with **solid architectural bones but rough, uninspired execution**. The UI feels like a developer built it without a designer's input — functional but generic, lacking personality and polish. Code quality is decent but inconsistent. Security has room for improvement. The repo is cluttered with legacy files and the project needs a focused design vision.

**The Good:**
- Strong tech stack (React 19, TypeScript strict, Vite 8, Tailwind v4)
- Proper separation of concerns (contexts, hooks, services)
- Real multiplayer with Firebase Realtime + Supabase
- Comprehensive CI/CD pipeline with security scanning
- Internationalization (i18next) ready
- Accessibility considerations (ARIA, focus traps, reduce motion)
- Battle pass, challenges, leaderboards, friends system — feature-complete
- **Theater components already have real animation code** — `VictorySequence` has a full canvas confetti implementation, CSS keyframe animations, glow effects, and stat cards. `SuccessTheater`, `FailureTheater`, `TurnTransition`, `StreakMilestone` all exist. The work isn't missing — it's confined to 5-second overlay moments.

**The Bad:**
- **UI/UX is bland and generic** — no cohesive visual identity
- **Design system is half-baked** — CSS variables exist but aren't consistently applied
- **Component styling is verbose and repetitive** — Tailwind utility soup everywhere
- **No animation/motion strategy** — transitions feel tacked on
- **Color palette is uninspired** — standard blue/amber/emerald without personality
- **Typography hierarchy is weak** — everything looks the same weight
- **Spacing and rhythm are inconsistent** — no clear scale system
- **Mobile experience is an afterthought** — responsive but not mobile-first

**The Ugly:**
- `.playwright-mcp/` tracked YAML files in git (should be gitignored)
- `commitlint.config.js` deleted but still referenced in CI
- Abandoned `FriendsPanel.tsx` at root level (moved to `components/friends/`)
- No visual regression testing despite heavy UI work
- Bundle size warnings being ignored (200KB+ main chunk)
- Accessibility audit is non-blocking and likely failing
- No E2E tests for critical flows (matchmaking, gameplay, shop purchases)

---

## 1. UI/UX Transformation

### Current State: Generic & Uninspired

The UI works, but it doesn't **spark joy** or **feel premium**. Everything uses the same rounded corners (`rounded-xl`, `rounded-full`), the same border patterns, the same hover effects. It's like a Bootstrap template from 2018.

#### Specific Issues:

**Home.tsx (views/Home.tsx:115-293)**
- Giant gradient blobs as "ambient effects" — overused pattern
- Stats displayed as boring rounded boxes with no hierarchy
- Primary CTA is just a big rounded button — no excitement
- Tier badges are present but don't feel prestigious
- No personality in copy ("Fast rounds. Tight pressure. Clean wins." — generic)

**Header.tsx (components/Header.tsx:158-525)**
- Fixed header with floating stats + profile dropdown — standard SaaS pattern
- Desktop sidebar with hover-expand — seen in every admin dashboard
- Mobile burger menu — expected but uninspired
- No gamification of the header itself (e.g., XP bar, animated nectar count)

**Leaderboards.tsx (views/Leaderboards.tsx:25-456)**
- Standard table layout with rank/avatar/username/stats
- Emoji medals for top 3 — cute but expected
- No visual celebration of #1 spot
- No animation when entering/scrolling
- Tier badges are tiny and don't convey prestige

**StashModal.tsx (components/StashModal.tsx:1-972)**
- 972 lines of modal code — massive component
- Three-column grid layout — Pinterest clone vibes
- Rarity badges with glow effects — good start but not enough
- Try-on preview is buried and doesn't feel interactive
- "Vault Keeper" character (Quartermaster Vey) is a static image with quote

### Design System Audit

**Current CSS Variables (via Tailwind v4):**
```css
--theme-ambient-glow
--theme-border-strong
--theme-shadow-glow
--theme-panel-gradient
--hover-scale
```

These exist but:
- Not documented anywhere
- Used inconsistently across components
- No clear naming convention
- No type safety (just strings in `style={}`)

**Colors:**
- `primary` — used for everything important
- `accent` — used for... also important things?
- `surface` — borders and backgrounds
- `text-main`, `text-muted` — text colors
- No semantic color tokens (success, warning, error, info are ad-hoc)

**Typography:**
- `font-black`, `font-bold`, `font-semibold`, `font-medium` — used randomly
- No clear hierarchy (h1, h2, h3 aren't semantically styled)
- `tracking-[0.2em]`, `tracking-[0.3em]`, `tracking-wider` — inconsistent letter-spacing
- Display font exists but only used in one place

**Spacing:**
- `gap-2`, `gap-3`, `gap-4`, `gap-5` — no clear scale
- `p-4`, `p-5`, `p-6`, `p-8`, `p-14` — random padding values
- `rounded-[20px]`, `rounded-[22px]`, `rounded-[28px]`, `rounded-[2rem]` — why?

### Transformation Strategy

#### Phase 1: Design System Overhaul (2-3 weeks)

**1.1 Color System**
- Define a **character-driven palette** tied to the "spelling bee" theme
- Primary: Vibrant honey yellow/gold (not generic blue)
- Accent: Deep purple/violet (royalty, magic)
- Success: Lush green (growth, correct answers)
- Error: Bold red (wrong answers, urgency)
- Surface: Rich dark tones with subtle texture (not flat black)
- Create semantic tokens: `color-correct`, `color-wrong`, `color-streak`, `color-premium`

**1.2 Typography System**
- Use a real display font for headlines (not just `font-black`)
- Define 6 text styles with clear use cases:
  - Display: Hero text, large numbers
  - Headline: Page titles, card titles
  - Subheadline: Subtitles, descriptions
  - Body: Paragraph text, UI labels
  - Caption: Small text, metadata
  - Mono: Stats, scores, timers
- Set up proper line-height and letter-spacing scales

**1.3 Spacing & Layout System**
- Use a 4px base unit: `4, 8, 12, 16, 24, 32, 48, 64, 96`
- Define layout patterns:
  - `stack-tight` (4px gap)
  - `stack-normal` (12px gap)
  - `stack-loose` (24px gap)
  - `grid-cards` (responsive card grid with consistent gaps)

**1.4 Component Patterns**
- Standardize button variants:
  - Primary (CTA actions)
  - Secondary (common actions)
  - Tertiary (subtle actions)
  - Danger (destructive actions)
- Standardize card patterns:
  - Elevated (modal, dialog)
  - Flat (inline content)
  - Interactive (hover states, click feedback)
- Standardize input patterns:
  - Text input with validation states
  - Select/dropdown with consistent styling
  - Toggle/checkbox/radio with clear states

**1.5 Motion System**
- Define animation curves:
  - `ease-smooth`: General UI transitions
  - `ease-bounce`: Playful interactions (correct answer, level up)
  - `ease-snap`: Quick feedback (button press)
- Define durations:
  - `duration-fast` (150ms): Hover states
  - `duration-normal` (300ms): Page transitions
  - `duration-slow` (500ms): Modal open/close
- Create reusable animation utilities:
  - Fade in/out
  - Scale in/out
  - Slide in from edges
  - Bounce/shake (for feedback)

#### Phase 2: Component Library Rebuild (3-4 weeks)

Extract 20-30 primitive components from the current codebase and rebuild them with the new design system:

**Primitives:**
- `Button` — 4 variants, 3 sizes, loading/disabled states, icon support
- `Badge` — rarity, status, tier variants with proper glow
- `Card` — elevated/flat/interactive with consistent border-radius
- `Avatar` — with fallback, online indicator, tier ring
- `ProgressBar` — animated, themed, step variants
- `Tooltip` — with arrow, position-aware
- `Modal` — with focus trap, scroll lock, backdrop
- `Toast` — 4 severity levels, autohide, action button
- `Input` — validation states, icon support, character counter

**Game-Specific:**
- `TierBadge` — rebuilt with proper prestige hierarchy (current version is too small/quiet)
- `WordCard` — for spelling display (needs big, bold treatment)
- `ScoreWidget` — live score with smooth count-up animation
- `StreakCounter` — fire emoji isn't enough; needs fire animation
- `TimerRing` — circular SVG timer with tension-building color shift
- `RoomCodeDisplay` — monospaced, copyable, styled prominently

#### Phase 3: View-by-View Redesign (4-6 weeks)

**Home (Priority: HIGH)**
- Replace ambient gradient blobs with a proper animated scene
- Stats section needs a complete rethink: make it feel like a player card
- CTA button needs presence — larger, with animated glow pulse
- Add live player count ticker (social proof)
- Add "recent games" feed or activity strip for returning users
- The badge "Competitive Spelling Arena" should feel like a status chip, not a div with tracking

**Leaderboards (Priority: HIGH)**
- Replace the basic table with a proper ranked list
- Top 3 should have trophy podium treatment (not just emoji)
- Animate rows in on load (stagger from top)
- Your rank should float/pin to the bottom of the viewport
- Add sparkline micro-chart for score history per player
- Tab navigation needs visual weight — currently looks like a bland pill row

**Play View (Priority: HIGHEST)**
- This is the core product — needs the most polish
- Word display: BIG, center-stage, with visual feedback on correct/wrong
- Input field needs personality — a custom styled input, not browser default
- Timer should create tension (color shift, shake near 0)
- Opponent scores displayed live with delta indicators
- Sound feedback cues should be visual too (flash, shake, bounce)

**StashModal (Priority: MEDIUM)**
- 972 lines is too many — break into `StashGrid`, `StashInspector`, `StashLoadout`
- The "Vault Keeper" NPC is a great idea, but a static PNG is weak
- Items should animate on equip (sparkle, pop)
- Theme preview should be a live mini scene, not 3 colored squares
- Rarity should feel scarce and prestigious — legendary items should demand attention

**Auth View (Priority: MEDIUM)**
- Almost certainly the first thing new users see
- Needs to set the tone for the entire experience
- Should have the ambient scene background, not a blank page
- Social proof (player count, recent activity)

---

## 2. Code Quality Transformation

### Current Issues

#### Critical

**1. Duplicate Leaderboard Implementation** — ✅ RESOLVED
`Header.tsx:118-148` contains a raw Supabase query to fetch leaderboard data — completely separate from the full `useLeaderboards` hook and `Leaderboards.tsx` view. The `Header` leaderboard modal is a mini version that queries `profiles` directly. This is:
- Data inconsistency risk (different sort/filter logic)
- Dead code — the `/leaderboards` route exists and is accessible from Home
- Security smell — unfiltered profile data exposed differently in two places

Fix: Remove `fetchLeaderboard` and the inline modal from `Header.tsx`. Add a "View Leaderboards" link in the sidebar that navigates to `/leaderboards`.

**2. Any Types** — ✅ RESOLVED (cited instances)
> `renderRow(entry: any)` deleted from `Leaderboards.tsx`; no `profile: any` cast remains in `Header.tsx`. (Project-wide `supabase gen types` migration is tracked separately as §7 #18.)
`Leaderboards.tsx:192` — `const renderRow = (entry: any, index: number)` — defeats TypeScript.  
Multiple `profile: any` casts in `Header.tsx:133`. The Supabase response types should be used or generated via `supabase gen types`.

**3. Missing Error Boundaries on Key Routes** — ✅ RESOLVED
> `RouteErrorBoundary.tsx` provides dedicated `BattlePassErrorBoundary`/`ChallengesErrorBoundary`/`LeaderboardsErrorBoundary` with route-specific copy; `App.tsx` wraps each route accordingly.
`/battle-pass`, `/challenges`, `/leaderboards` all use `HomeErrorBoundary` — wrong boundary. A leaderboard error should say "leaderboard failed to load", not a home-page error message.

**4. Version is 0.0.0**
`package.json:5` — `"version": "0.0.0"`. CI checks for this and warns. If semantic-release is set up, either commit a proper initial version or let it do its job.

#### Major

**5. `useEffect` Dependency Array Issues**
`Home.tsx:99` — `successImpact` is created inline on every render as `() => vibrate("success")`, making it unstable. It's listed as a dependency but recreated every render, causing the streak toast effect to potentially re-fire. The haptic callbacks should be `useCallback`-wrapped.

**6. StashModal is 972 Lines**
This is a single file doing layout, item logic, bundle logic, theme preview, try-on preview, and loadout summary. Split into:
- `StashLayout.tsx` — shell, header, currency display
- `StashItemGrid.tsx` — the browsable item list
- `StashInspector.tsx` — the right-panel item detail
- `StashThemePreview.tsx` — theme live preview
- `StashLoadout.tsx` — active loadout summary
- `useSash.ts` — all the item selection/equip state logic

**7. useMemo Overuse in Leaderboards.tsx** — ✅ RESOLVED
> `currentLeaderboard`, `loadMoreCurrent`, and `currentPage` are now plain ternaries; only `refreshCurrent` is kept as `useCallback` because it is a dependency of the tab-change effect.
`Leaderboards.tsx:59-120` — `currentLeaderboard`, `refreshCurrent`, `loadMoreCurrent`, and `currentPage` are all derived from a simple `switch (activeTab)`. These don't need `useMemo` — they're cheap computations and the `useMemo` overhead costs more than it saves. These should be plain variables.

**8. `React.useEffect` Inside Component Body (Header.tsx:81)** — ✅ RESOLVED
> `Header.tsx` imports and uses `useEffect` directly (line 1, used at 66 & 78).
Calling `React.useEffect` instead of importing and using `useEffect` directly is inconsistent with the rest of the codebase. Minor but noisy.

**9. `@playwright/test` in `dependencies`** — ✅ RESOLVED
> Now in `devDependencies` (`package.json:35`).
`package.json:16` — `@playwright/test` is a test-only dependency. It belongs in `devDependencies`. Right now it ships in the production bundle analysis.

**10. Missing `vitest` Config** — ✅ RESOLVED
> `vitest.config.ts` present in root.
There's no `vitest.config.ts` in root. Tests rely on implicit config from `vite.config.ts` — fragile for a project with multiple test files.

#### Minor

**11. `t('stash.bundleLabel')` shown for all items** — ✅ RESOLVED
> Gated on `isBundleSelected` (`StashModal.tsx:579`); non-bundles show their category eyebrow.
`StashModal.tsx:532` — `t('stash.bundleLabel')` is displayed in the inspection rail for ALL items, not just bundles. This is a label bug.

**12. `saveLastPlayedMode` exported from `Home.tsx`** — ✅ RESOLVED
> Moved to `utils/lastPlayedMode.ts`.
`Home.tsx:19` — utility function exported from a view file. Move to `utils/` or `services/`.

**13. Unstable key in Leaderboards renderRow** — ✅ RESOLVED
> `renderRow` deleted; rows are rendered internally by `LeaderboardTable`.
`Leaderboards.tsx:199` — `key={entry.userId}` used in conditional block, which is fine, but the `renderRow` function returns `null` at the bottom. Components with `null` returns still count against reconciliation. Small but worth cleaning.

---

## 3. Security Transformation

### Current State

The security architecture is documented but has some implementation gaps.

#### Issues

**1. Firebase Auth → Supabase Trust Gap**
The app uses Firebase Auth UIDs as Supabase profile identifiers. Migration `20260805000000_fix_firebase_uid_and_profiles_updated_at.sql` addresses part of this, but the trust boundary between Firebase JWTs and Supabase anon key operations needs explicit RLS validation. Verify every Supabase table's RLS policies enforce `auth.uid() = firebase_uid` correctly.

**2. No Rate Limiting on Leaderboard Fetches**
`Header.tsx:118` fetches leaderboard data with no debounce, cache, or rate limit. A user who spam-clicks the leaderboard button fires unlimited Supabase queries. Add a minimum refresh interval (e.g., 30 seconds) and cache the result in component state.

**3. CSP Configuration Unverified**
README mentions CSP headers in Firebase Hosting config, but `firebase.json` wasn't checked in this audit. Verify `Content-Security-Policy` is set, includes `connect-src` for Supabase and Firebase URLs, and blocks `unsafe-eval`.

**4. DiceBear Avatar URL Construction**
`Header.tsx:204` and `Header.tsx:379`:
```ts
`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
```
`user.uid` comes from Firebase — it's a Firebase-controlled string, so XSS via UID is unlikely, but DiceBear API v7 may have breaking changes. Pin to a specific DiceBear version and add a `Content-Security-Policy` `img-src` directive covering `api.dicebear.com`.

**5. `npm audit --audit-level=high || true`**
`ci.yml:309` — the `|| true` means high-severity vulnerabilities don't fail CI. This is a documentation smell. Change the audit level to `moderate` and remove `|| true` for critical findings. Add a suppression file for accepted risks.

**6. `OWASP Dependency-Check` with `continue-on-error: true`**
`ci.yml:319` — findings never block merge. For a shipped product, CVSS ≥ 7 should block.

**7. Supabase Anon Key in Frontend**
Expected and documented, but ensure RLS policies are comprehensive. Run `supabase inspect db` to verify no tables are exposed without RLS. The CI supabase-health job should fail if any table has RLS disabled.

**8. No CSRF Protection on Logout**
`Header.tsx:112` — logout fires on button click with no CSRF token. Firebase Auth's `signOut` handles this server-side, but if the app adds custom backend endpoints, this pattern won't scale safely.

---

## 4. Repository Tidiness Transformation

### Current State: Cluttered

#### Immediate Fixes (do this today)

**1. `.playwright-mcp/` files tracked in git**
Git status shows 6 `AD` entries:
```
AD .playwright-mcp/page-2026-08-04T17-00-56-497Z.yml
AD .playwright-mcp/page-2026-08-05T08-08-41-028Z.yml
...
```
These are staged deletions of MCP browser automation session files. They should never have been tracked. Add to `.gitignore`:
```
.playwright-mcp/
```
Then clean: `git rm -r --cached .playwright-mcp/`

**2. Orphaned `components/FriendsPanel.tsx`**
Git status shows `D components/FriendsPanel.tsx` — it was deleted but the original should be committed. The component moved to `components/friends/FriendsPanel.tsx`. Make sure nothing still imports from the old path. (App.tsx:41 uses `@/components/friends` correctly — good.)

**3. `commitlint.config.js` deleted but CI still calls it**
Git status: `D commitlint.config.js`  
CI: `npx commitlint --from=... --to=... --verbose`  
If commitlint config was intentionally deleted, remove the CI step. If it was accidentally deleted, restore it. Currently every PR fails the commitlint check.

**4. `package.json:16` — `@playwright/test` in `dependencies`**
Should be `devDependencies`. It affects npm audit output and bundle analysis.

**5. `version: "0.0.0"` in package.json**
Either release a v1.0.0 or configure semantic-release to manage it.

#### Structure Issues

**6. No `src/` directory**
All source files are at root level alongside config files. Standard practice is to have source in `src/`. This isn't blocking but makes the root directory noisy — `App.tsx`, `i18n.ts`, `firebase.ts`, `main.tsx` sit next to `package.json`, `vite.config.ts`, `tsconfig.json`, etc.

**7. `docs/` exists but is it maintained?**
`experience-roadmap.md` and `design-improvement-plan.md` are in `docs/` — if this document supersedes them, archive or delete to avoid confusion. Dead docs are worse than no docs.

**8. `public/health.json` is build-generated**
`package.json` build script runs `node scripts/generate-health.mjs` to write `public/health.json`. This file should be in `.gitignore` since it's generated. Currently it's tracked (`M public/health.json`).

**9. Missing `.env.template` validation**
README documents `.env.template` but the CI job checks for env vars at runtime. Add a `scripts/check-env.mjs` script that validates `.env.local` has all required keys before `npm run dev`, integrated as a pre-dev hook.

**10. No `CHANGELOG.md`**
`semantic-release` is configured but there's no `CHANGELOG.md` in the repo. Either commit an initial changelog or add it to `.gitignore` if semantic-release manages it dynamically.

---

## 5. Testing Transformation

### Current State: Unit Tests Only, No E2E

**What exists:**
- `services/gameService.test.ts`
- `services/playWordUtils.test.ts`
- `services/playPanelUtils.test.ts`
- `services/playRewardUtils.test.ts`
- `services/playTimerUtils.test.ts`
- `services/playRoomUtils.test.ts`
- `services/playUpdateUtils.test.ts`
- `services/profileService.test.ts`
- `data/customizationCatalog.test.ts`
- `data/themePackages.test.ts`

**What's missing:**

1. **No hook tests** — `useLeaderboards`, `useChallenges`, `useFriendInvites` have zero test coverage
2. **No component tests** — `StashModal`, `Header`, `Home`, `Leaderboards` are all untested
3. **No integration tests** — Firebase ↔ Supabase interaction flows
4. **No E2E tests** — Playwright is installed but there are no `.spec.ts` files for critical flows:
   - User registration → profile creation
   - Public matchmaking → game start
   - Correct/incorrect answer submission
   - Shop purchase → inventory update
   - Friend invite → accept → friends list

**Recommendation:**
- Add `vitest.config.ts` with explicit configuration
- Add `setupTests.ts` with global mocks for Firebase and Supabase
- Write component tests for at least `StashModal`, `Home`, and `Header`
- Write 3 E2E flows with Playwright: auth, matchmaking, shop
- Set test coverage threshold at 60% for `services/` and `hooks/`

---

## 6. Performance Transformation

### Current State: Warnings Ignored

**Bundle size warnings are non-blocking:**
CI warns but never fails when main chunk exceeds 200KB gzip. With Firebase SDK, Supabase SDK, PostHog, react-router, i18next, and lucide-react all bundled — this will only grow.

**Actions:**
1. **Lazy-load all views** — only `App.tsx` and auth-critical code in the initial chunk:
   ```tsx
   const BattlePass = lazy(() => import('./views/BattlePass'));
   const Leaderboards = lazy(() => import('./views/Leaderboards'));
   // etc.
   ```
2. **Lazy-load the Shop and StashModal** — they're heavy and only open on demand
3. **Firebase tree-shaking** — verify only used Firebase modules are imported
4. **i18n chunks** — load locale files on demand, not all upfront
5. **Image optimization** — `/assets/shopkeeper.png` should be WebP with `<picture>` fallback
6. **`@playwright/test` out of `dependencies`** — it's adding to npm install time and possibly bundle analysis noise

---

## 7. Priority Action Plan

### This Week (Critical / Quick Wins)

| # | Item | File(s) | Effort | Status |
|---|------|---------|--------|--------|
| 1 | ~~Add `.playwright-mcp/` to `.gitignore` and clean~~ | `.gitignore` | 10 min | ✅ done — `.gitignore:46`, files untracked |
| 2 | ~~Fix or remove broken `commitlint` CI step~~ | `ci.yml`, restore/delete config | 30 min | ✅ done — step removed from `ci.yml`; config deleted |
| 3 | ~~Move `@playwright/test` to `devDependencies`~~ | `package.json` | 5 min | ✅ done — `package.json:35` |
| 4 | ~~Remove inline leaderboard fetch from Header~~ | `Header.tsx` | 1 hour | ✅ done — no Supabase import/fetch; `onLeaderboard` → `navigate("/leaderboards")` (`Header.tsx:261,277`) |
| 5 | ~~Fix `t('stash.bundleLabel')` shown for all items~~ | `StashModal.tsx:579` | 15 min | ✅ done — gated on `isBundleSelected` |
| 6 | ~~Add `vitest.config.ts`~~ | new file | 30 min | ✅ done — `vitest.config.ts` present |
| 7 | ~~Add `public/health.json` to `.gitignore`~~ | `.gitignore` | 5 min | ✅ done — `.gitignore:49` |
| 8 | ~~Fix `header.stash` missing from `en.json`~~ | `public/locales/en.json` | 5 min | ✅ done |
| 9 | ~~Fix `common.notifications` wrong key path~~ | `components/NotificationBell.tsx:170` | 5 min | ✅ done |
| 10 | ~~Fix leaderboard stat columns all showing 0~~ | `hooks/useLeaderboards.ts`, Supabase view | 2 hours | ✅ done — column drift: write path fills `wins`/`corrects`, MVs read never-written `games_won`/`total_correct_words`. Migration `20260817000000` remaps `games_won←wins`, `total_correct_words←corrects` + broadens activity filter. `max_streak`/`games_played` have no profile write source (stay 0, out of scope) |
| 11 | ~~Fix Auth page heading renders both states simultaneously~~ | `views/Auth.tsx:113` | 15 min | ✅ done — single `{isLogin ? 'Log in' : 'Sign up'}` span |

### Next Sprint (High Impact)

| # | Item | Effort | Status |
|---|------|--------|--------|
| 12 | ~~Migrate `GameplayStage.tsx` to GSAP (definition/word transitions, streak pop, timer smooth, input shake) + uninstall framer-motion~~ | 2 hours | ✅ done — GSAP migration complete; `framer-motion` removed from `package.json` |
| 13 | ~~Pass `feedbackType` from `Play.tsx` to `GameplayStage`~~ | 30 min | ✅ done |
| 14 | ~~Establish color token system in Tailwind v4 CSS~~ | 3 days | ✅ done — semantic tokens `color-correct`/`wrong`/`streak`/`premium` + `success`/`error`/`warning`/`info` in `@theme`→`:root` (`styles.css`); build-validated |
| 15 | ~~Define typography scale~~ (+ apply) | 2 days | ✅ scale defined — 6 text styles (`text-display`/`headline`/`subheadline`/`body`/`caption`/`mono`) + `stack-*`/`grid-cards` spacing + `ease-smooth`/`bounce`/`snap` & `duration-*` motion tokens (`styles.css` `@layer components`). Consistent retrofit across existing views proceeds with the Phase 3 redesigns (#26–28) |
| 16 | ~~Rebuild `Button`, `Badge`, `Card` primitives~~ | 3 days | ✅ done — `components/ui/` `Button` (4 variants×3 sizes, loading/icon), `Badge`, `Card`, plus `ProgressBar`/`Avatar`/`Input` + barrel `index.ts`; typecheck + build clean |
| 17 | ~~Break up `StashModal.tsx` into 5 components~~ | 2 days | ✅ done — 1021→50-line thin orchestrator; logic in `stash/useStash.ts`, presentational `stash/{StashLayout,StashItemGrid,StashInspector,StashThemePreview,StashLoadout,StashTryOnPreview,StashShared}.tsx` (props via `Pick<UseStashReturn>`, wired by JSX spread); public API (`StashModal`/default/`StashModalProps`) preserved; typecheck + build clean |
| 18 | Replace `any` types with Supabase-generated types | 2 days | ⬜ todo |
| 19 | ~~Add `useCallback` to haptic handlers in `Home.tsx`~~ | 1 hour | ✅ done |
| 20 | ~~Lazy-load all views in `App.tsx`~~ | 2 hours | ✅ done — Auth/Lobby/Play/ScenePreview/BattlePass/Challenges/Leaderboards/Watch/Ranked/Tournaments via `lazy()` behind `Suspense` |
| 21 | ~~Set up test infra and add hook tests~~ | 3 days | ✅ done — `vitest.config.ts` (node default + per-file jsdom opt-in), shared `test-utils/supabaseMock.ts`, and hook suites for `useLeaderboards`/`useChallenges`/`useFriendInvites` (8 tests). A dedicated `setupTests.ts` proved unnecessary: with `globals: true`, `@testing-library/react` v16 auto-registers `cleanup()`. Full suite 13 files / 45 tests green; typecheck clean |
| 22 | Add GSAP stagger to Lobby difficulty cards | 1 hour | ✅ done — `Lobby.tsx:32` `useGSAP` `gsap.from` grid children (opacity/y, `stagger:0.06`); guarded by `performanceTier==="static" \|\| reduceMotion`, `clearProps` preserves hover-lift |
| 23 | Add GSAP row stagger to Leaderboards | 1 hour | ✅ done — `LeaderboardTable` (`LeaderboardComponents.tsx:388`) `useGSAP` `gsap.from` rows (opacity/y, `stagger:0.03`); reduce-motion guarded, keyed on `entries[0]?.userId` (load-more safe), scoped + `clearProps` |
| 24 | ~~Fix `getModeColor()` in `Lobby.tsx` — replace hardcoded colors with theme tokens~~ | 1 hour | ✅ done — uses `text-primary`/`border-primary`/`text-text-main`/`border-surface` tokens |
| 25 | Add ambient scene background to Auth view | 2 hours | ✅ done |

### Month 2 (Polish & Prestige)

| # | Item | Effort | Status |
|---|------|--------|--------|
| 26 | Play view resting state redesign — visual word echo, waveform speaking indicator, custom input | 1 week | ⬜ todo — highest visual priority |
| 27 | Full Home view redesign (player card, live count) | 1 week | ⬜ todo |
| 28 | Leaderboard podium redesign with row animations | 1 week | ⬜ todo |
| 29 | Play view timer ring (circular SVG replacing flat bar) | 2 days | ✅ done |
| 30 | E2E test coverage for 3 critical flows | 1 week | ⬜ todo |
| 31 | OWASP/audit failures block CI (remove `|| true`) | 1 day | ⬜ todo |
| 32 | Social login (Google/Discord) on Auth page | 3 days | ⬜ todo — reduces friction for new players |

---

## 8. The One-Line Summary Per Category

- **UI:** Functional but generic — needs a visual identity, not just CSS variables
- **Code Quality:** TypeScript strict mode is set but not lived up to; `any` types and 972-line components undercut it
- **Security:** Good intentions (RLS, CSP, RPCs) but audit failures are suppressed and leaderboard data is fetched twice with different trust
- **Repo:** `.playwright-mcp/` files, orphaned components, deleted config still referenced in CI — clean it up before it compounds
- **Testing:** Unit tests for services are solid; everything from hooks upward is a blind spot
- **Performance:** Lazy loading is the single highest-ROI change — do it now

---

*This document is the living spec for HiveSpell v2. Update it as items are completed.*

---

## 9. Visual UI Audit — Full Walkthrough (2026-08-07)

> **Method:** Live Playwright session on `localhost:5173` (Vite dev, authenticated as `fogydes`).  
> **Screenshots:** `ui-audit/01-19` — every accessible surface captured.  
> **Session scope:** All screens reachable from an authenticated session. Auth/login page not accessible (auto-redirect). Mobile Stash/Shop and Settings sub-tabs (Display, Privacy, Account, About) not captured.

---

### 9.1 Executive Summary

HiveSpell has strong creative DNA. The naming, economy metaphors, 3-column modal layouts, and lore copy all point to a product with a cohesive personality. The "theatre" components — Stash, Shop, Profile dossier, Messages — are genuinely impressive in their depth.

**Three problems are critical:**

1. **Broken core loop.** `Public Match` → `startGame` RPC fails silently with `P0001: Room not found`. User lands in a permanently-stuck arena (`WATCHING...`, disabled input, timer running, zero feedback). No matchmaking screen exists. No error message. No recovery path.
2. **React crash on Battle Pass.** `useMemo` at `BattlePass.tsx:47` is called conditionally, violating Rules of Hooks. Error boundary fires. Page is completely blank and inaccessible.
3. **Firebase UID / Supabase UUID mismatch.** Fires on every page load. `checkShadowBanStatus` and `battle_pass_progress` both receive a Firebase UID (`NNnck7IDfxZQQqH3l8fat7wk1842`) where a `uuid` type is expected → `22P02` errors logged in every session.

Everything else is polish, data, or cosmetic — but these three block the primary user journey.

---

### 9.2 Complete Bug Table

#### P0 — Critical (Blocks Core Flow)

| ID | Bug | Location | Error |
|----|-----|----------|-------|
| B1 | `useMemo` called conditionally → hooks violation → error boundary, page blank | `components/battlepass/BattlePass.tsx:47` | "Rendered more hooks than during the previous render" |
| B2 | `startGame` RPC fails silently → user stuck in `WATCHING...` with disabled input | Supabase RPC `start_game` | `P0001: Room not found` |

#### P1 — High (Systemic Data / Auth)

| ID | Bug | Location | Error |
|----|-----|----------|-------|
| B3 | `checkShadowBanStatus` → UUID type mismatch → 400 on every page load | RPC `is_shadow_banned` | `22P02: invalid input syntax for type uuid` |
| B4 | `battle_pass_progress` query → 406 Not Acceptable | Supabase REST query | Firebase UID passed where UUID expected |
| ✅ B5 | ~~Profile relic count `"4 {{count}} relics logged"` — variable not substituted~~ | `components/ProfileModal.tsx:353,581` | **RESOLVED** — `t()` passes `{ count: collectionCount }`; all 4 locales carry `{{count}}` |
| ✅ B6 | ~~`stash.inactive` shown as raw key in active loadout Badge slot~~ | `components/StashModal.tsx` | **RESOLVED** — `stash.inactive` present in en/es/fr/ar |

#### P2 — Medium (UX Degraders)

| ID | Bug | Location | Notes |
|----|-----|----------|-------|
| ✅ B7 | ~~`common.pending` shown as raw key on Pending tab~~ | `components/friends/FriendsPanel.tsx` | **RESOLVED** — `common.pending` present in en/es/fr/ar |
| ✅ B8 | ~~`friends.viewProfile` shown as raw key on action button~~ | `components/friends/FriendsPanel.tsx` | **RESOLVED** — `friends.viewProfile` present in en/es/fr/ar |
| B9 | Notification deduplication missing: 3 identical "dabbg accepted your friend request!" entries (126d / 137d / 158d) | `components/NotificationBell.tsx` | Same event rendered multiple times |
| ✅ B10 | ~~Challenges Daily + Weekly both show 0/0 progress~~ | `hooks/useChallenges.ts`, `views/Challenges.tsx` | **RESOLVED** — distinct loading/empty/error states rendered (see #43) |

#### P3 — Low (Visual / Polish)

| ID | Bug | Location | Notes |
|----|-----|----------|-------|
| ✅ B11 | Tier name "Platinum" truncated to "Pla" on Home stats card | `views/Home.tsx` stats grid | **RESOLVED** — `whitespace-nowrap` added to `TierBadge` containers (#44) |
| ✅ B12 | Arena shows "Bro" (Bronze) while Profile shows Platinum | `components/play/GameplayStage.tsx` | **RESOLVED** — arena derives tier from shared `getTierFromStats()` + `TierBadgeMini` (#44/#45) |
| ✅ B13 | `@sentry/react` imported but not installed → startup warning | `services/logger.ts` | **RESOLVED** — Sentry scaffolding removed entirely; logging routes to `/api/logs` (#46) |
| B14 | Friends panel label reads `Friends1` — count attached without space | `components/friends/FriendsPanel.tsx` | Cosmetic string concat bug |

---

### 9.3 Screen-by-Screen Findings

#### Screen 01 — Home (`/`) `ui-audit/01-home.png`

**Works:** Bee/honeycomb hero, currency display, tier badge, quick-nav to Lobby/Leaderboards/Challenges.  
**Issues:**
- Tier "Platinum" truncated to "Pla" in stats card (B11) — stat column lacks min-width or `white-space: nowrap`
- Resting state is static — stats, CTA, and info blocks compete at equal visual weight with no hierarchy
- No animation on mount; no ambient life between interactions
- "Newbee" rank in header is correct lore but new users have no context for what it means

**Fix B11:** In the stats grid, ensure the tier column has `min-w-fit` or truncate protection. "Diamond" (7 chars) is the longest tier name and must fit.

---

#### Screen 02 — Lobby (`/lobby`) `ui-audit/02-lobby.png`

**Works:** 8 difficulty tiers in a scannable grid, dual CTA (Public Match / Ranked) per row, Friends sidebar, Join Private at top.  
**Issues:**
- No matchmaking waiting room — clicking Public Match teleports directly to `/play/[difficulty]` which immediately breaks (B2)
- No loading/spinner between click and game start
- Friends sidebar shows only dabbg (Bronze, Offline, 5d ago) — visually lonely; consider a "0 friends online" empty state

**Critical missing flow:** Lobby → [Matchmaking screen: spinner + "Searching..." + cancel] → arena. Without this, the RPC failure has nowhere to surface feedback.

---

#### Screen 03 — Leaderboards (`/leaderboards`) `ui-audit/03-leaderboards.png`

**Works:** Clean ranked list structure, tier badges visible.  
**Issues (from earlier session log):** `gamesWon`, `totalCorrectWords`, `nectar`, `maxStreak` all show 0 for every user. `composite_score` renders correctly. The RPC/view returns composite but per-stat fields aren't mapped in `hooks/useLeaderboards.ts`.

---

#### Screen 04 — Battle Pass `ui-audit/04-battle-pass.png`

**Status: Completely inaccessible (B1).** Error boundary fires. Page shows fallback UI. Two root causes stack:
1. `useMemo` at `BattlePass.tsx:47` is inside a conditional → React throws on render
2. Even if fixed, `battle_pass_progress` query returns 406 (B4) due to Firebase UID/UUID mismatch

**Fix B1:** Move the `useMemo` call unconditionally above all early returns. Use the memoized value inside the conditional, not the hook call itself. This is a 5-line restructure.

---

#### Screen 05 — Challenges (`/challenges`) `ui-audit/05-challenges.png`

**Issues:** All Daily and Weekly challenges show `0/0`. The card and progress bar UI renders correctly — the data layer is the problem. `hooks/useChallenges.ts` either fetches and maps to zero or silently fails.  
**Missing states:** "Loading", "No challenges this week", and "Error loading" all look identical (all zeros). Add distinct visual states.

---

#### Screen 07 — Stash / Relic Vault `ui-audit/07-stash-modal.png`

**Works:** 3-column layout (NPC sidebar | item grid | inspector rail), item rarity labels, active loadout section with Theme/Cursor/Badge slots, owned items in grid.  
**Issues:**
- Badge slot in active loadout shows raw key `stash.inactive` (B6) — the most-used section of the modal
- Fix: add `"inactive": "No badge equipped"` (or equivalent) to all locale files under the `stash` namespace

---

#### Screen 08 — Shop / Aetheric Bazaar `ui-audit/08-shop-modal.png`

**Works:** Same 3-column architecture as Stash (consistent and well-executed), "The Aetheric Bazaar" copy is the strongest brand voice in the product, dual currency display (🍯/💎) is clear, item cards with pricing are visible.  
**Issues:** None blocking. Cleanest surface in the audit.

---

#### Screens 10–11 — Mobile (375×812) `ui-audit/10-mobile-home.png`, `11-mobile-lobby.png`

**Works:** Layout holds at 375px, no horizontal overflow observed, header compresses correctly.  
**Issues:**
- Tier truncation (B11) is more pronounced on narrow viewport
- **Not tested:** Stash/Shop 3-column modals on mobile — these are architecturally complex and almost certainly need responsive breakpoints. High-risk unknown.

---

#### Screen 12 — Notifications `ui-audit/12-notifications.png`

**Issues:**
- 3 identical "Friend Request Accepted — dabbg accepted your friend request!" entries at 126d / 137d / 158d (B9)
- These appear to be real, distinct database events — but rendering them identically looks broken to the user
- Consider grouping: "dabbg accepted your request ×3" with the most recent date, or showing unique microsecond timestamps

---

#### Screen 13 — Profile Menu `ui-audit/13-profile-menu.png`

**Works:** 5-item dropdown (Profile, Friends, Messages, Settings, Logout) opens cleanly without navigating away. Username shown at top. Correct overlay behavior.

---

#### Screen 14 — Gameplay Arena (`/play/learner`) `ui-audit/14-matchmaking.png`

**Status: Core loop broken (B2).** 3-panel layout renders (Hive Chat | People scoreboard | Game state), but the game never starts. `startGame` returns `P0001: Room not found`. Result: `WATCHING...` label, disabled input, timer counting from 10.0s with no explanation.

This is the worst UX moment in the product. The primary user action silently fails, leaves the user stranded with no feedback, no error message, and no escape except knowing to find "Exit Arena."

**Expected flow (missing):** Lobby → matchmaking screen with spinner + cancel → game starts with opponent or bot fallback → arena with live, enabled input.

---

#### Screen 15 — Profile Dossier `ui-audit/15-profile.png`

**Works:** Exceptional depth — avatar, tier badge, active loadout, collection vault, dossier stats (Wins: 32, Corrects: 1,598, Reserve ratio: 83%), "Current: Platinum → Next: Diamond (26%)" progression arc, "Archivist notes" lore copy. The "Archivist notes" section is the best game writing in the product.  
**Issues:** `"4 {{count}} relics logged"` (B5) — appears twice, above the collection vault heading and in the collection count. The `t()` call isn't passing `{ count: items.length }`.

---

#### Screens 16–17 — Messages `ui-audit/16-messages-inbox.png`, `17-messages-thread.png`

**Works:** Full Messenger-style inbox + thread view, real chat history (Mar 19–Jun 30 with dabbg), voice message support ("Hold to record"), file/image upload, read receipts (✓ / ✓✓), "Search conversation" in thread header.  
**Issues:** None blocking. The messages system is more feature-complete than most standalone chat apps — arguably over-engineered relative to the broken game loop it sits alongside.

---

#### Screen 18 — Settings `ui-audit/18-settings.png`

**Works:** Audio tab — TTS Volume (100%), SFX Volume (50%), Replay Speed selector (0.7x–1.0x). The Replay Speed selector is a thoughtful detail for a listening-focused game.  
**Not captured:** Display, Privacy, Account, About tabs — unknown state.

---

#### Screen 19 — Friends Panel `ui-audit/19-friends-panel.png`

**Works:** Dialog opens, shows dabbg (Bronze), 3-tab layout (Friends / Pending / Search).  
**Issues:**
- `common.pending` raw key on Pending tab (B7)
- `friends.viewProfile` raw key on action button (B8)
- `Friends1` — count concatenated without space (B14)

These three suggest the entire friends component batch was added without a corresponding i18n pass.

---

### 9.4 The Resting State Problem (Expanded)

*(First identified in Section 0 session log — detailed here.)*

The product operates in two distinct visual modes:

**Theatre mode** (modals and overlays: Stash, Shop, Profile, Messages, Settings, Friends) — rich, layered, animated, immersive. Opening the Aetheric Bazaar feels like entering a different, better product.

**Resting mode** (full page views: Home, Lobby, Leaderboards, Challenges) — static information grids. They work but they don't *feel* like anything. No ambient motion, no idle animation, no suggestion the world is alive.

The contrast is sharp. Returning from the Shop modal to the Lobby feels like a downgrade. This is the single most important design-feel problem to solve — and it doesn't require new features, only motion:

- **Home:** animate stat counters on mount (count-up), pulse tier badge, show streak flame if streak > 0
- **Lobby:** spring-lift on difficulty card hover, stagger cards in on mount
- **Leaderboards:** stagger rows in on scroll-into-view, animate "your rank" pin
- **Challenges:** animate progress bars from 0 → current on mount, not just static renders

All of these are GSAP animations (see the revised Library decision in §0) that can be added incrementally without touching data logic. Per-theme WebGL scenes (Three.js) are the larger, lazy-loaded companion feature.

---

### 9.5 Additional Priority Items (Appended to Section 7)

Items 33–48 supplement the existing plan in Section 7:

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 33 | ✅ **DONE** — `BattlePass.tsx` — all hooks (`useMemo`/`useCallback`) run unconditionally above early returns | P0 | 30 min |
| 34 | ✅ **DONE** — `startGame` RPC wired (`multiplayerService.ts:397` → `start_game`) via `startGameRoom`; `ArenaStatusScreen` waiting/connecting states in `Play.tsx` | P0 | 1 day |
| 35 | ✅ **DONE** — migration `20260805000000` alters `user_id`→TEXT, RLS via `auth.jwt()->>'sub'`, all challenge RPCs take `p_user_id TEXT` | P1 | 2 hours |
| 36 | ✅ **DONE** — `ProfileModal.tsx:353,581` pass `{ count }`; all 4 locales have `{{count}}` | P1 | 15 min |
| 37 | ✅ **DONE** — `stash.inactive` present in en/es/fr/ar | P1 | 10 min |
| 38 | ✅ **DONE** — `common.pending` present in en/es/fr/ar | P2 | 10 min |
| 39 | ✅ **DONE** — `friends.viewProfile` present in en/es/fr/ar | P2 | 10 min |
| 40 | ✅ **DONE** — `FriendsPanel` modal tabs use `flex flex-1 items-center justify-center gap-1.5`; label wrapped in `<span>`, count pill separated | P2 | 5 min |
| 41 | Add i18next-parser CI step — fail on missing keys | P2 | 2 hours |
| 42 | ✅ **DONE** — `dedupedNotifications` memo keyed by `type:from_user_id` in `NotificationBell.tsx` | P2 | 1 hour |
| 43 | ✅ **DONE** — Fixed Challenges 0/0: distinct loading/empty/error states rendered in `views/Challenges.tsx` | P2 | 2 hours |
| 44 | ✅ **DONE** — Fixed tier truncation "Pla"/"Bro": added `whitespace-nowrap` to `TierBadge` containers | P3 | 30 min |
| 45 | ✅ **DONE** — Audited tier consistency: arena now uses shared `getTierFromStats()` (matches profile/header) | P3 | 1 hour |
| 46 | ✅ **DONE** — Removed `@sentry/react` scaffolding from `services/logger.ts` (logging → `/api/logs`) | P3 | 30 min |
| 47 | ✅ **DONE** — `components/friends/` (FriendsPanel/FriendList/InviteModal) fully i18n'd; +30 `friends.*` keys added to en/es/fr/ar | P3 | 1 hour |
| 48 | ✅ **DONE** — `ArenaStatusScreen` error variant: 🐝 + dev error detail + Retry + Return-to-Lobby | P0 | 2 hours |

---

### 9.6 Coverage Summary

| Surface | Screenshot | Status |
|---------|-----------|--------|
| Home | `01-home.png` | Works — polish issues (B11) |
| Lobby (desktop) | `02-lobby.png` | Works — core loop broken (B2) |
| Leaderboards | `03-leaderboards.png` | Works — stat columns all 0 |
| Battle Pass | `04-battle-pass.png` | **Broken — error boundary (B1)** |
| Challenges | `05-challenges.png` | Renders — data 0/0 (B10) |
| Stash modal | `07-stash-modal.png` | Works — i18n gap (B6) |
| Shop modal | `08-shop-modal.png` | ✅ Cleanest surface |
| Lobby + Friends | `09-lobby-friends.png` | Works |
| Mobile Home | `10-mobile-home.png` | Works — truncation worse |
| Mobile Lobby | `11-mobile-lobby.png` | Works |
| Notifications | `12-notifications.png` | Works — dedup bug (B9) |
| Profile menu | `13-profile-menu.png` | ✅ Works |
| Arena / Gameplay | `14-matchmaking.png` | **Broken — core loop (B2)** |
| Profile dossier | `15-profile.png` | Works — i18n gap (B5) |
| Messages inbox | `16-messages-inbox.png` | ✅ Works |
| Messages thread | `17-messages-thread.png` | ✅ Works |
| Settings (Audio) | `18-settings.png` | ✅ Works |
| Friends panel | `19-friends-panel.png` | Works — 3 i18n gaps (B7/B8/B14) |
| Auth/login page | ❌ Not accessible | Redirect (logged in) |
| Mobile Stash/Shop | ❌ Not captured | **Unknown — high risk** |
| Settings sub-tabs | ❌ Not captured | Unknown |

---

*Audit completed 2026-08-07. All 19 screenshots archived in `ui-audit/`. Next action: address items 33–35 (P0 blockers) before any visual polish work.*
