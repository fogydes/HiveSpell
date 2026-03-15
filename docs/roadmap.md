# Roadmap

This roadmap captures the current improvement plan for HiveSpell based on the existing codebase, recent documentation work, and the main risks identified in gameplay, data ownership, and contributor workflow.

## Goals

- make multiplayer state safer and harder to corrupt
- reduce long-term data drift between Firebase and Supabase
- turn the project into a contributor-friendly codebase
- refactor carefully without destabilizing gameplay
- improve confidence through tests, docs, and CI

## Guiding Principles

- prefer small, reversible changes over large rewrites
- keep realtime gameplay stable while improving structure
- move persistent business logic toward trusted backend ownership
- document backend assumptions before changing them
- add tests before or alongside risky refactors

## Phase 1: Stabilize The Current Baseline

Objective: make sure the recent security and tooling changes behave correctly in the real app.

Steps:

1. Manually verify authentication flows.
2. Verify public matchmaking and private room joins.
3. Verify win, loss, timeout, and disconnect flows.
4. Confirm new Firebase rules do not break normal room play.
5. Watch for regressions in profile, leaderboard, and room player stats.

Exit criteria:

- no obvious room write failures
- normal gameplay still works end to end
- wins and corrects still update as expected

## Phase 2: Choose A Canonical Backend Model

Objective: decide which backend owns long-term player data.

Recommended ownership model:

- Firebase owns auth identity, usernames, live rooms, room players, and realtime multiplayer state
- Supabase owns persistent profile data and social/product state

Recommended Supabase-owned fields:

- `wins`
- `corrects`
- `title`
- `current_nectar`
- `lifetime_nectar`
- `inventory`
- `avatar_url`
- social data such as friendships, messages, and notifications

Recommended Firebase-owned areas:

- authenticated user identity
- username to UID mapping
- room creation and membership
- turn state
- intermission state
- room-local player snapshots

Steps:

1. Document exact ownership per field.
2. Audit current reads and writes in auth, profile, gameplay, and header flows.
3. Update UI reads so persistent stats come from one canonical location.
4. Reduce or eliminate duplicate writes across both systems.

Exit criteria:

- each important field has one clear source of truth
- profile and leaderboard no longer depend on cross-service drift

## Phase 3: Move Persistent Stat Updates Toward Trusted Backend Logic

Objective: stop relying on ordinary clients to update long-term player records.

Why this matters:

- current gameplay still resolves too much from the client
- room members can drive transitions that affect persistent outcomes
- security rules can reduce damage, but they cannot fully replace server authority

Recommended order:

1. move win persistence to trusted backend logic
2. move correct-count persistence to trusted backend logic
3. move nectar rewards and title recalculation there too
4. only after that, consider moving more gameplay resolution server-side

Possible implementation options:

- Firebase Functions
- another trusted backend endpoint

Exit criteria:

- clients no longer directly decide other users' persistent outcomes
- title and progression changes happen in one controlled place

## Phase 4: Fix Shop And Inventory Integration

Objective: make ownership, purchases, and equipped state consistent.

Current issues:

- shop items and stash behavior are only partially aligned
- theme ownership rules are unclear
- equip behavior is not yet a complete system

Steps:

1. define a single shared item catalog
2. decide which themes are free and which are unlockable
3. persist equipped state in the profile model
4. make the stash reflect ownership and equipped state
5. make the shop and stash use the same item metadata

Exit criteria:

- bought items have visible effect
- free items and paid items are clearly separated
- stash no longer offers misleading actions

## Phase 5: Refactor `views/Play.tsx` Incrementally

Objective: reduce risk and improve maintainability without a dangerous rewrite.

Important note:

This should be done gradually. The file is large, but that alone is not a reason to rush. The safest path is to split by responsibility in small steps.

Recommended extraction order:

1. presentational UI pieces
2. pure helper functions
3. custom hooks

Suggested first extractions:

- player list panel
- room chat panel
- timer/progress display
- intermission and winner display

Suggested pure helpers:

- turn selection
- timer calculations
- win-condition checks
- reward calculations

Suggested hooks later:

- `useRoomDriver`
- `useRoundTimer`
- `useTypingSync`

Exit criteria:

- smaller focused files
- less gameplay logic hidden inside JSX-heavy components
- easier testing of room and round behavior

## Phase 6: Expand Test Coverage

Objective: protect gameplay and backend-facing logic during refactors.

Current baseline:

- unit tests exist for a small part of `gameService`
- CI now runs typecheck, tests, and build

Next test priorities:

1. reward and title calculations
2. turn-order helpers after extraction
3. answer-checking edge cases
4. auth context profile hydration behavior
5. multiplayer room lifecycle behavior

Longer-term:

- integration tests for critical user flows
- regression tests around disconnect and intermission logic

Exit criteria:

- core gameplay helpers are covered
- high-risk refactors can be made with confidence

## Phase 7: Expand Operational Documentation

Objective: make the project easier to run and maintain.

Documentation targets:

1. Firebase data model and room lifecycle
2. Supabase schema and RPC evolution notes
3. contributor testing checklist
4. deployment troubleshooting
5. gameplay architecture notes after refactors

Exit criteria:

- contributors can onboard without digging through every file
- maintainers can reason about backend expectations quickly

## Suggested Execution Order

1. stabilize and manually verify the current baseline
2. choose canonical persistent data ownership
3. update reads and writes to follow that ownership
4. move persistent stat updates to trusted backend logic
5. fix shop and inventory integration
6. refactor `views/Play.tsx` in small slices
7. expand tests around extracted logic
8. continue improving operational docs

## Risks To Watch

- tightening rules too far and breaking normal gameplay
- refactoring `views/Play.tsx` before behavior is documented
- changing profile ownership without tracing every consumer
- treating room-local stats and global stats as the same thing

## Practical Next Step

The next best concrete task is:

1. write the canonical field ownership plan
2. map every current reader and writer of wins, corrects, title, and nectar
3. implement the ownership change in small steps

That gives the best balance of safety, clarity, and forward progress.
