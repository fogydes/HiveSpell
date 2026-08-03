# HiveSpell Transformation Strategy

**Generated:** 2026-08-01  
**Status:** Comprehensive Audit → Strategic Direction  
**Context:** Full project reconnaissance complete (codebase, vault, Graphify graph, planning docs)

---

## Executive Summary

HiveSpell is a **technically solid but visually and experientially flat** real-time multiplayer spelling game. The architecture is clean, the backend is well-considered (Firebase + Supabase split), and the codebase has undergone meaningful refactoring (Play.tsx decomposed into 7 hooks + 7 services). However, the product **feels like a prototype**—not a polished, commercially viable game.

**Core Problem:** The experience layer (visual design, motion, atmosphere, feedback loops, onboarding, retention hooks) has not received proportional investment relative to the backend and gameplay logic. The game works; it doesn't *delight*.

**Opportunity:** The theme package system (forest, ice, royal, honey, night) and the experience-roadmap.md provide a clear north star. The transformation is about **executing that vision with rigor**—treating the visual/experience layer as a first-class engineering discipline, not an afterthought.

---

## Part 1: Honest Assessment

### 1.1 What Works (Strengths)

| Area | Evidence | Grade |
|------|----------|-------|
| **Architecture** | Clean React 19 + TS strict, context separation, custom hooks for gameplay logic, service layer abstraction | A |
| **Backend Split** | Firebase (Auth, Realtime DB, Hosting) + Supabase (Postgres, RPCs, Storage, Realtime) — each used for its strength | A |
| **Server-Owned Progression** | RPCs for XP/nectar/stats — no client-side trust | A |
| **Security Hardening** | CSP headers, path traversal fixes, search sanitization, anti-cheat (WPM validation, input rate limiting) | A- |
| **Theme Foundation** | CSS variable system, 5 theme packages, custom cursors, cursor trails, atmospheric backgrounds | B+ |
| **Multiplayer Sync** | Turn-based driver model, host migration, stale room cleanup, TTS + Supabase audio fallback | B+ |
| **Social Layer** | Friends, notifications, DMs, room chat — implemented via Supabase Realtime + RLS | B |

### 1.2 What's Broken (Critical Gaps)

#### Visual & Experience Design (Grade: D+)

| Issue | Location | Impact |
|-------|----------|--------|
| **Home view empty for guests** | `Home.tsx:75-90` — stats only show for logged-in users; zero hook for new visitors | No conversion funnel |
| **Auth view generic** | `Auth.tsx` — standard form, no personality, no progressive disclosure | High bounce risk |
| **Lobby difficulty cards static** | `Lobby.tsx:177-210` — grid of cards, no visual distinction, no "feel" of difficulty | Choice paralysis |
| **Play view utilitarian** | `Play.tsx` — functional but sterile; GameplayStage receives 25+ props, no scene composition | Low retention |
| **No onboarding flow** | New users drop into Lobby with no guidance | Activation failure |
| **No victory/defeat theater** | Round ends, next word appears — no moment | No dopamine |
| **Mobile density pass incomplete** | `TASKS.md` lists ChatPanel phone-density as next; sidebar overlaps, private code bar overlaps | Mobile UX broken |

#### Product Quality Gaps

| Gap | Description | Severity |
|-----|-------------|----------|
| **No meta-progression hooks** | Titles exist but no visible tier progression, no season pass, no daily/weekly challenges | Retention |
| **Shop/Stash feel like admin panels** | Functional but zero "shopping" joy — no previews, no rarity theater, no "just bought" celebration | Monetization readiness |
| **Audio system unmonitored** | TTS + Supabase recordings but no fallback telemetry, no quality metrics, no "report audio" | Gameplay integrity |
| **Anti-cheat client-only** | WPM validation + input rate limiting only; no server-side replay verification | Competitive integrity |
| **Friend system passive** | Add/remove works but no invites, no "play with friend" CTA, no presence-rich lobby | Virality |
| **Notification system incomplete** | ToastContext exists but no in-app notification center, no email/push, no preferences | Engagement |

### 1.3 Architecture Debt (Technical)

| Debt Item | Location | Risk |
|-----------|----------|------|
| **Play.tsx still 480 lines** | Despite hook extraction, view remains massive orchestrator | Maintainability |
| **GameplayStage: 25+ props** | `Play.tsx:446-471` — prop drilling, tight coupling | Refactor target |
| **No error boundaries** | Crash in one component kills whole game | Reliability |
| **No feature flags** | All users get all features; no staged rollouts | Release safety |
| **Supabase RPCs: no search_path** | Documented in MISTAKES_AND_LESSONS.md #48 — migration-time bomb | DB stability |
| **TypeScript strict but `any` in hooks** | `usePlayTurn.ts`, `useWinnerAward.ts` have explicit `any` | Type safety |

### 1.4 Graphify Analysis Insights

The knowledge graph (321 nodes, 276 edges, 94 communities) reveals:

**God Nodes (high centrality = architectural risk):**
1. `loadData()` in AuthContext — single point of failure for user hydration
2. AuthContext itself — everything depends on it
3. Supabase Client Config — all Supabase calls route through one config

**Community Clusters (natural module boundaries):**
- **Gameplay Core** (usePlayDriver, usePlayTurn, usePlayRoundTimers, useWinnerAward, usePlayRoomLifecycle)
- **Social Layer** (useRoomChat, Supabase Realtime, Friends, Notifications)
- **Theme System** (ThemeProvider, packages, cursor effects, SceneBackground)
- **Audio Pipeline** (gameService speak/primeWordAudio, Supabase Storage)
- **Progression/RPC** (Supabase RPCs, profile stats, shop/stash)

**Surprising Connections:**
- Theme packages import `gameService` for word bank access (circular-ish)
- `playPanelUtils` connects both gameplay and social panels (shared layout logic)
- `MultiplayerContext` touches both Firebase Realtime DB and Supabase (dual-backend coupling)

---

## Part 2: Strategic Direction

### 2.1 North Star (from experience-roadmap.md)

> **Transform HiveSpell from a "working spelling game" into a "living competitive arena" where every visual, audio, and interaction decision reinforces the tension, mastery, and identity of play.**

Three pillars:
1. **Atmosphere First** — Theme packages become *scene packages* (lighting, particles, audio-reactive backgrounds, cursor as gameplay extension)
2. **Feedback Theater** — Every correct/incorrect/turn/eliminate/victory moment has designed micro-interactions
3. **Progression as Identity** — Titles, cosmetics, stats visible in lobby/play/profile → social signaling

### 2.2 Product Positioning

| Current | Target |
|---------|--------|
| "Spelling game with multiplayer" | "Competitive spelling arena with seasons, cosmetics, and spectacle" |
| Functional UI | Themed scenes that *are* the UI |
| Solo + public matchmaking | Ranked seasons, private leagues, friend lobbies, spectator mode |
| Static difficulties | Dynamic difficulty with daily/weekly modifiers |
| No retention hooks | Daily challenges, streak rewards, battle pass, leaderboards |

---

## Part 3: Phased Transformation Roadmap

### Phase 0: Foundation Hardening (Weeks 1-2) — *Do Not Skip*

**Goal:** Stabilize the platform before building experience on top.

| Task | Source | Owner |
|------|--------|-------|
| Add error boundaries at route level (Home, Auth, Lobby, Play) | Architecture gap | Frontend |
| Add feature flag system (LaunchDarkly-style or custom context) | Architecture gap | Frontend |
| Fix Supabase RPC `search_path` on all functions | MISTAKES_AND_LESSONS #48 | Backend |
| Replace `any` in hooks with proper types | TypeScript audit | Frontend |
| Add Sentry/logging for client errors + Supabase RPC errors | Observability | Full-stack |
| CI: add bundle size check, typecheck, test on PR | improvement-plan.md Track F | DevEx |

**Exit Criteria:** Zero runtime errors in staging for 48h; all PRs pass typecheck + tests.

---

### Phase 0.5: Authoritative Game Logic — Validated Driver Pattern (Weeks 2-3) — *P0 Critical*

**Goal:** Move game coordination logic from client-side driver (Firebase RTDB writes) to server-authoritative Supabase RPCs with pg_cron safety-nets. This eliminates the risk of driver disconnection, race conditions, and client-side cheating.

**Current Problem (Client-Side Driver):**
- One player elected as "driver" via `usePlayDriver` hook in `Play.tsx`
- Driver writes directly to Firebase Realtime DB: word assignment, timer expiration, elimination, round restart
- If driver disconnects → host migration race condition → game stalls
- Client trust: driver could manipulate word selection, timer, eliminations
- No server-side verification of game state transitions

**Solution: Validated Driver Pattern**
- **Client proposes → Server validates & executes atomically via RPC**
- **pg_cron safety-nets** run every 30–60s to catch stalled games
- **Firebase RTDB** retains only ephemeral sync (currentInput, presence) — no authority

| Deliverable | Implementation |
|-------------|----------------|
| **Word Banks Table** | `word_banks(locale, difficulty, word)` — source of truth for word selection |
| **RPC: `pick_word(room_id, locale, difficulty)`** | Atomic: picks word avoiding recent, sets startTime, timerDuration, turnOrder, currentTurnPlayerId |
| **RPC: `eliminate_player(room_id, player_id, reason)`** | Atomic: marks eliminated, advances turn or triggers intermission, returns next state |
| **RPC: `advance_turn(room_id, player_id, was_correct, new_streak)`** | Atomic: updates score, clears input, advances to next player or intermission |
| **RPC: `restart_round(room_id)`** | Atomic: resets all alive players, clears gameState, sets status=playing |
| **RPC: `start_game(room_id, locale, difficulty)`** | Atomic: sets status=playing, picks first word, initializes turnOrder |
| **RLS: Lock game_state writes to RPC-only** | `UPDATE` on `rooms.gameState` only via SECURITY DEFINER RPCs; direct client writes denied |
| **pg_cron: Timer Watchdog (every 30s)** | `SELECT check_expired_timers();` — eliminates players whose timer expired but driver missed |
| **pg_cron: Intermission Watchdog (every 60s)** | `SELECT check_stalled_intermissions();` — restarts rounds stuck in intermission |
| **pg_cron: Orphaned Room Cleanup (every 5m)** | `SELECT cleanup_abandoned_rooms();` — marks stale waiting/playing rooms finished |

**Key Files to Create/Modify:**
- `supabase/migrations/XXXXXXXX_create_validated_driver.sql` — word_banks table, RPCs, RLS, pg_cron jobs
- `hooks/usePlayDriver.ts` — replace Firebase RTDB writes with RPC calls (`supabase.rpc()`)
- `services/playUpdateUtils.ts` — remove `build*Update` helpers (no longer building client-side updates)
- `services/playRoomUtils.ts` — keep `findNextActiveTurnPlayer`, `calculateTurnDuration` for RPC use
- `views/Play.tsx` — `isGameDriver` memo becomes `isLocalDriver` (only for optimistic UI, not authority)

**Validation:**
- Driver disconnect mid-game → pg_cron catches within 30s, game continues
- Malicious client tries to call RPC with wrong params → RPC validates room state, rejects
- Word selection deterministic per locale/difficulty — no client trust needed
- All game state transitions auditable in Postgres

**Exit Criteria:** Zero "game stalled" reports in staging; driver disconnects handled silently within 30s; all game actions go through RPCs.

---

### Phase 1: Theme Package → Scene Package (Weeks 3-6)

**Goal:** Elevate 5 theme packages from "color swaps" to **distinct atmospheric scenes**.

| Deliverable | Spec Reference | Implementation |
|-------------|----------------|----------------|
| **Scene Layer Architecture** | experience-roadmap.md Phase 3 | New `SceneProvider` wrapping `ThemeProvider`; three layers: `AmbientBase` (gradients/glows), `ParticleField` (floating pollen, snow, embers), `AudioReactive` (pulse on word speak, heartbeat on low time) |
| **Cursor as Gameplay Extension** | experience-roadmap.md Phase 2 | Trail intensity = streak; cursor shape = mode (hex for genius, crystal for ice); click burst = correct answer |
| **Theme Package Spec v2** | design-improvement-plan.md Visual Consistency | Each package defines: `colorTokens`, `ambientGlow`, `particlePreset`, `cursorPreset`, `audioTexture` (subtle background hum), `transitionChoreography` (enter/exit animations) |
| **Scene Transitions** | experience-roadmap.md Phase 3 | Lobby → Play: iris wipe with theme color; Play → Lobby: reverse; difficulty change: particle morph |
| **Mobile Scene Performance** | design-improvement-plan.md Mobile-Specific | `prefers-reduced-motion` disables particles; low-end device detection falls back to static ambient |

**Key Files to Create:**
- `context/SceneContext.tsx` — orchestrate layers, expose `useScene()`
- `components/scene/AmbientBase.tsx`, `ParticleField.tsx`, `AudioReactive.tsx`
- `data/themes/sceneSpecs.ts` — typed scene package definitions
- `hooks/useCursorTrail.ts` — streak-reactive trail

**Validation:** Each theme package has a `/scene-preview` route showing all layers in isolation + composition.

---

### Phase 2: Feedback Theater & Moment Design (Weeks 7-10)

**Goal:** Every gameplay moment has designed micro-interactions.

| Moment | Current | Target | Implementation |
|--------|---------|--------|----------------|
| **Word Spoken** | TTS plays, input enables | Audio-reactive glow pulse; word "materializes" in center; cursor trail flares | `GameplayStage` → `WordReveal` component; sync with `speak()` promise |
| **Correct Answer** | Green flash, streak++ | Particle burst at cursor; streak counter animates; WPM badge "stamps" in; haptic (mobile) | `WordCorrectionModal` → `SuccessTheater` component; `usePlayTurn` emits event |
| **Incorrect/Eliminate** | Red flash, modal | Screen shake (reduced-motion safe); word "shatters"; elimination badge; spectator transition | `WordCorrectionModal` → `FailureTheater`; `PlayerListPanel` animates out eliminated |
| **Turn Handoff** | Instant | Outgoing player fades; incoming player "warps in" with theme trail; timer bar morphs | `usePlayRoundTimers` → `TurnTransition` component |
| **Victory (Last Standing)** | Next round starts | **Full theater:** confetti/particles in theme style; winner avatar enlarges; XP/nectar counter animates; "Victory" banner; share button | `useWinnerAward` → `VictorySequence` (3-5s skippable) |
| **Round Complete (Non-Elimination)** | Status → intermission | Streak summary card; "Next word in 3s" countdown with theme pulse | `IntermissionCard` component |

**Technical Approach:**
- Event bus: `GameplayEvents` (typed) emitted from hooks → consumed by Scene/Stage components
- `usePlayTurn`, `usePlayRoundTimers`, `useWinnerAward` emit; `GameplayStage` + `SceneProvider` listen
- All animations: Framer Motion (already in deps via motion utilities) or CSS animations for performance
- **Respect `prefers-reduced-motion`** — every theater moment has a static fallback

---

### Phase 3: Onboarding & Activation Funnel (Weeks 11-13)

**Goal:** Convert anonymous visitors → activated players → retained users.

| Flow | Current | Target |
|------|---------|--------|
| **Landing (Guest)** | Home.tsx shows stats only if logged in | **Hero + Playable Demo:** Animated word cycle (hear → type → correct) in 10s; "Try Now" → guest Play (no auth, baby difficulty, 3 words) |
| **Guest → Signup** | Auth.tsx separate page | Inline modal after demo: "Save your streak?" → email/password → seamless continue |
| **First Lobby** | Difficulty grid, no guidance | **Guided Path:** "Start Here" badge on baby; tooltip explains public vs private; "Play with Friend" CTA if friend online |
| **First Play** | Cold start | **Tutorial Overlay:** 3-step coach marks (listen → type → enter); optional skip; completes → "Welcome" toast + 50 nectar |
| **First Loss** | Generic elimination | **Comeback Hook:** "You were 1 letter off — try again?" → instant requeue same difficulty; +25 nectar |

**Key Files:**
- `views/OnboardingDemo.tsx` — standalone guest playable
- `components/onboarding/CoachMarks.tsx`, `WelcomeModal.tsx`
- `hooks/useOnboardingState.ts` — tracks steps, persists to localStorage

**Metrics:** Target 40% guest → signup; 60% signup → first play; 30% first play → D1 retention.

---

### Phase 4: Progression & Identity Systems (Weeks 14-18)

**Goal:** Make progression visible, social, and rewarding.

| System | Current | Target |
|--------|---------|--------|
| **Titles/Ranks** | `userData.title` shown in Home/Profile | **Visible Tier Badges:** Bronze/Silver/Gold/Platinum/Diamond/Queen (Hive theme); animated in lobby, play, profile; season reset with legacy badge |
| **Seasonal Battle Pass** | None | **Free + Premium Track:** 50 tiers; cosmetics (cursors, trails, themes, emotes); XP from play, wins, streaks, dailies; premium ~$5/season |
| **Daily/Weekly Challenges** | None | **3 Dailies + 1 Weekly:** "Win 2 public baby games", "Achieve 300 WPM burst", "Play with a friend"; rewards: nectar, XP, battle pass progress |
| **Leaderboards** | Basic in ProfileModal | **Multi-Dimension:** Global (season), Friends, Daily, Mode-specific; paginated, animated rank changes; "You are here" marker |
| **Shop/Stash Redesign** | Functional grids | **Themed Boutique:** Rarity theater (common/rare/epic/legendary reveals); "Try On" preview in scene; bundles; daily rotation; nectar + premium currency |
| **Friend Invites & Presence** | Add/remove only | **Rich Presence:** See friend's mode, status (lobby/play/spectating); "Join" button → deep link; "Spectate" (read-only room view); invite link copies to clipboard |

**Backend (Supabase):**
- New tables: `seasons`, `battle_pass_tiers`, `challenges`, `challenge_progress`, `leaderboards` (materialized views refreshed hourly)
- RPCs: `claim_daily_challenge()`, `claim_battle_pass_tier()`, `refresh_leaderboards()`
- RLS: Public read for leaderboards; user-only write for challenge progress

---

### Phase 5: Competitive Integrity & Spectacle (Weeks 19-22)

**Goal:** Harden for ranked play; add spectator/esports hooks.

| Area | Work |
|------|------|
| **Server-Side Replay Verification** | Record every keystroke + timestamp in room; on high-WPM flag, RPC verifies human-like timing distribution (not just average) |
| **Ranked Mode** | ELO/Glicko-2 per mode; seasonal placement matches; decay for inactivity; separate queue from public |
| **Spectator Mode** | Read-only room view; delay 5s; shows all players' inputs, WPM, streak; shareable URL (`/watch/:roomId`) |
| **Replay System** | Post-game "Watch Replay" — scrubbable timeline with word events, eliminations, victory moment |
| **Anti-Cheat Hardening** | Client fingerprinting (canvas, audio, behvioral); server-side anomaly detection; shadow-ban queue for suspicious accounts |

---

### Phase 6: Polish & Scale (Weeks 23-26)

| Area | Work |
|------|------|
| **Accessibility Audit** | improvement-plan.md Track E — full WCAG 2.1 AA; screen reader test; color contrast in all themes; keyboard-only play |
| **Performance Budget** | < 3s TTI on 3G; < 150kb JS gzipped; scene layers lazy-loaded; particle fields use canvas/WebGL not DOM |
| **Internationalization** | i18n infrastructure; word banks per locale; RTL support for Arabic/Hebrew |
| **Platform Expansion** | PWA manifest; offline queue for solo practice; desktop wrapper (Tauri/Electron) for native cursors/notifications |
| **Analytics & Experimentation** | PostHog/Amplitude; funnel tracking; A/B test onboarding variants, battle pass pricing, difficulty curves |

---

## Part 4: Implementation Priority Matrix

| Priority | Phase | Effort | Impact | Dependencies |
|----------|-------|--------|--------|--------------|
| **P0** | 0 | 2 weeks | Stability | None |
| **P1** | 1 | 4 weeks | Differentiation | P0 |
| **P2** | 2 | 4 weeks | Retention | P1 (Scene layers) |
| **P3** | 3 | 3 weeks | Activation | P0, P1 |
| **P4** | 4 | 5 weeks | Monetization/Retention | P2, P3 |
| **P5** | 5 | 4 weeks | Competitive Moat | P4 |
| **P6** | 6 | 4 weeks | Scale/Compliance | All |

**Total: ~26 weeks (6.5 months) for full vision.**

**Minimum Viable Transformation (12 weeks):** P0 + P1 + P2 + P3 = **Scene packages + Feedback theater + Onboarding**. This alone moves the product from "prototype" to "polished indie game."

---

## Part 5: Specific Code-Level Recommendations

### 5.1 Component Architecture Refactor

**Current:** `Play.tsx` (480 lines) → `GameplayStage` (25+ props)

**Target:**
```
Play.tsx (thin orchestrator, ~80 lines)
  ├── SceneProvider (theme + particle + audio-reactive layers)
  ├── GameplayDirector (orchestrates: WordReveal, TurnTransition, SuccessTheater, FailureTheater, VictorySequence)
  ├── GameplayStage (presentational only: receives currentWord, definition, timeLeft, status)
  ├── PlayerListPanel (unchanged)
  ├── RoomChatPanel (unchanged)
  └── MobilePlayActions (unchanged)
```

**Action:** Extract `GameplayDirector` component; move all theater logic out of hooks into event-driven components.

### 5.2 Theme/Scene System Types

```typescript
// data/themes/sceneSpecs.ts
export interface ScenePackage {
  id: string;
  displayName: string;
  colorTokens: ColorTokenSet;
  ambient: AmbientSpec;        // gradients, glows, blur radii
  particles: ParticlePreset;   // type, count, physics, color mapping
  cursor: CursorPreset;        // shape, trail, streak mapping
  audioTexture: AudioTexture;  // background hum, UI sound variants
  transitions: TransitionChoreography; // enter/exit, difficulty change
  performance: PerformanceTier; // full / reduced / static
}

export const SCENE_PACKAGES: Record<string, ScenePackage> = {
  forest: { /* pollen particles, green glow, leaf cursor, forest hum */ },
  ice: { /* snowflakes, blue glow, crystal cursor, wind hum */ },
  royal: { /* gold dust, purple glow, crown cursor, chime hum */ },
  honey: { /* bee particles, amber glow, hex cursor, buzz hum */ },
  night: { /* stars, dark glow, moon cursor, cricket hum */ },
};
```

### 5.3 Gameplay Event Bus

```typescript
// hooks/useGameplayEvents.ts
type GameplayEvent =
  | { type: 'WORD_SPOKEN'; word: string; mode: string }
  | { type: 'ANSWER_CORRECT'; word: string; wpm: number; streak: number }
  | { type: 'ANSWER_INCORRECT'; word: string; typed: string }
  | { type: 'TURN_HANDOFF'; from: string; to: string; timeLeft: number }
  | { type: 'PLAYER_ELIMINATED'; playerId: string; place: number }
  | { type: 'VICTORY'; winnerId: string; finalStats: FinalStats }
  | { type: 'INTERMISSION_START'; duration: number; streak: number };

const GameplayEventBus = createTypedEventBus<GameplayEvent>();
export const useGameplayEvents = () => GameplayEventBus;
```

Hooks emit; `SceneProvider` + `GameplayDirector` subscribe.

### 5.4 Anti-Cheat: Server-Side Replay

```sql
-- Supabase migration
CREATE TABLE room_keystroke_log (
  room_id UUID REFERENCES rooms(id),
  player_id UUID REFERENCES profiles(id),
  word TEXT,
  keystrokes JSONB, -- [{char: 'a', t: 123}, {char: 'b', t: 145}, ...]
  submitted_at TIMESTAMPTZ DEFAULT now(),
  wpm INT,
  flagged BOOLEAN DEFAULT FALSE
);

CREATE INDEX ON room_keystroke_log (room_id, player_id);
```

RPC `verify_keystroke_log(room_id, player_id)` → statistical analysis (inter-keystroke intervals fit human distribution?).

---

## Part 6: Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Scene performance on low-end mobile** | High | High | `prefers-reduced-motion` + device tier detection → static fallback; canvas-based particles; lazy-load scene layers |
| **Scope creep on battle pass** | High | Medium | Define 50 tiers *before* build; freeze spec at Phase 4 start; no design changes during implementation |
| **Supabase RPC migration failures** | Medium | Critical | `search_path` fix first (P0); test migrations on branch; staging = production mirror |
| **Audio quality inconsistency** | Medium | Medium | Phase 0: add audio monitoring; Phase 2: design system for UI sounds (not just TTS); fallback library |
| **Team bandwidth** | High | High | Phase 0-3 = solo-able by 1-2 devs; Phase 4+ needs backend + frontend parallel; plan hiring/contractors early |
| **Firebase + Supabase dual-backend complexity** | Medium | Medium | Document data ownership clearly; avoid new cross-backend dependencies; consider consolidating to Supabase Realtime for v2 |

---

## Part 7: Success Metrics

| Metric | Baseline (Est.) | 3-Month Target | 6-Month Target |
|--------|-----------------|----------------|----------------|
| **D1 Retention** | ~15% | 30% | 40% |
| **D7 Retention** | ~5% | 15% | 25% |
| **Guest → Signup** | ~5% | 25% | 40% |
| **Avg Session Length** | ~8 min | 15 min | 22 min |
| **Daily Active Users** | ~50 | 500 | 2,000 |
| **Nectar Revenue (if monetized)** | $0 | $500/mo | $3,000/mo |
| **Session Error Rate** | ~2% | <0.5% | <0.1% |
| **TTI (3G)** | ~6s | <3s | <2s |

---

## Part 8: Immediate Next Steps (This Week)

1. **Create Phase 0 task list in `TASKS.md`** with checkboxes, owners, due dates
2. **Branch `transform/phase0-foundation`** — implement error boundaries, feature flags, RPC `search_path` fix
3. **Design ScenePackage TypeScript spec** — `data/themes/sceneSpecs.ts` (can start in parallel)
4. **Add Sentry to staging** — capture baseline error rates
5. **Schedule design review** — walk through `sceneSpecs` with designer (or self-review against experience-roadmap.md)
6. **Update Graphify graph** — `/graphify . --update` after Phase 0 merge

---

## Appendix: Document References

| Document | Purpose | Key Insights for Transformation |
|----------|---------|---------------------------------|
| `docs/experience-roadmap.md` | 9-phase vision | Phases 1-4 = Scene packages, Visual tokens, Scene layers, FX engine — **primary north star** |
| `docs/design-improvement-plan.md` | 23 UX/visual issues | Critical: mobile sidebar, private code bar, room code overlaps; Visual: empty states, typography, border overuse |
| `docs/improvement-plan.md` | 6-track technical plan | Security, DB integrity, Code quality, Frontend resilience, Accessibility, DevEx — **Phase 0 source** |
| `~/knowledge/projects/HiveSpell/PROJECT_STATE.md` | Current state | Mobile-density pass in progress; 5 theme packages; dependency PRs resolved |
| `~/knowledge/projects/HiveSpell/TASKS.md` | Task tracking | Next: ChatPanel phone-density, second flagship package, themeify Play/NotFound |
| `~/knowledge/projects/HiveSpell/CODEX.md` | Architecture handoff | Progression = server RPCs; audio = unmonitored; social = Supabase Realtime |
| `~/knowledge/learnings/MISTAKES_AND_LESSONS.md` | 53 documented mistakes | #48: set search_path on Supabase functions; #12: verify DB schema before queries; #54: gate rewards behind multiplayer |
| `graphify-out/GRAPH_REPORT.md` | Codebase topology | God nodes: loadData, AuthContext, Supabase Client Config; Communities map to natural modules |

---

**End of Transformation Strategy**

*This document is a living artifact. Update after each phase completion. Store in vault at `~/knowledge/projects/HiveSpell/TRANSFORMATION.md` and commit to repo.*