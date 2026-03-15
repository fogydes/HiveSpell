# Data Ownership Plan

This document defines the recommended source of truth for persistent player data in HiveSpell and maps the current read and write paths that need to be cleaned up.

## Why This Exists

HiveSpell currently stores overlapping player data in both Firebase and Supabase. That makes the app harder to reason about and creates drift risks between:

- live room/session state
- long-lived profile state
- leaderboard/profile displays

The goal of this plan is to make each field belong to one backend on purpose.

## Core Rule

- Firebase should own realtime, session-oriented state.
- Supabase should own persistent profile and product state.

## Recommended Ownership

### Firebase should own

- authentication identity
- username lookup index used for login
- rooms
- room players
- room-local score snapshots
- current turn, streak, intermission, and other live gameplay state
- presence and transient room chat

### Supabase should own

- profile display data
- username for profile display
- wins
- corrects
- title
- current nectar
- lifetime nectar
- inventory
- equipped theme
- equipped cursor
- equipped badge
- avatar URL
- leaderboard-facing profile fields
- friendships
- messages
- notifications

## Field-By-Field Recommendation

| Field | Current state | Recommended owner | Notes |
| --- | --- | --- | --- |
| `username` | Firebase `users`, Firebase `usernames`, Supabase `profiles` | Supabase `profiles` for display, Firebase `usernames` as login index | Keep Firebase username index only for login lookup; stop treating Firebase `users.username` as profile truth |
| `wins` | Firebase `users`, Supabase `profiles`, room player snapshot | Supabase `profiles` | Room player `wins` should remain a join-time or room-local snapshot only |
| `corrects` | Firebase `users`, Supabase `profiles`, room player snapshot | Supabase `profiles` | Same pattern as wins |
| `title` | Firebase `users`, Supabase `profiles` | Supabase `profiles` | Prefer deriving/updating from canonical persistent stats |
| `stars` | Firebase `users` legacy field | none long-term | Replace with Supabase nectar fields and retire it |
| `current_nectar` | Supabase only | Supabase `profiles` | Canonical |
| `lifetime_nectar` | Supabase only | Supabase `profiles` | Canonical |
| `inventory` | Supabase only | Supabase `profiles` | Canonical |
| `equipped_theme` | local storage today, Supabase profile moving forward | Supabase `profiles` | Keep local storage as client fallback, but persist the equipped theme in the profile row |
| `equipped_cursor` | local storage fallback, Supabase profile target | Supabase `profiles` | Persist equipped cursor item when schema is ready |
| `equipped_badge` | local storage fallback, Supabase profile target | Supabase `profiles` | Persist equipped badge item when schema is ready |
| `avatar_url` | Supabase only | Supabase `profiles` | Canonical |
| room player `wins/corrects/score` | Firebase room state | Firebase room snapshot | These are not profile truth; they exist for in-room display and gameplay |

## Current Read Paths

### `context/AuthContext.tsx`

Current behavior:

- reads Firebase `users/{uid}`
- reads Supabase `profiles`
- merges both into `userData`
- syncs Firebase `corrects/wins` into Supabase when they differ

Problem:

- `userData` becomes a hybrid object whose values come from different systems depending on timing

Target:

- read persistent profile fields from Supabase
- read only Firebase identity or legacy fallback values if needed during migration

### `context/MultiplayerContext.tsx`

Current behavior:

- fetches fresh `corrects` and `wins` from Firebase before creating or joining a room
- passes those values into room player snapshots

Problem:

- multiplayer depends on Firebase for persistent stat truth

Target:

- use Supabase-owned profile stats for room snapshot initialization

### `components/Header.tsx`

Current behavior:

- header nectar/title display comes from `userData`
- leaderboard reads `corrects` and `wins` from Supabase

Problem:

- the app already trusts Supabase for leaderboard truth but not consistently for the signed-in user

Target:

- make `userData` itself Supabase-backed for persistent profile fields

### `components/ProfileModal.tsx`

Current behavior:

- reads profile stats directly from Supabase

Target:

- keep this behavior

### `components/FriendsPanel.tsx` and `services/friendService.ts`

Current behavior:

- read `title` from Supabase profile rows

Target:

- keep this behavior

### `views/Play.tsx`

Current behavior:

- writes win/correct/title/star changes into Firebase `users`
- updates room player snapshot values in Firebase

Problem:

- persistent progression is still being changed from gameplay client code

Target:

- keep room-local player updates in Firebase
- move persistent profile updates away from Firebase user documents

### `views/Auth.tsx`

Current behavior:

- creates Firebase `users/{uid}` with `stars`, `title`, `corrects`, and `wins`

Problem:

- new accounts still seed legacy persistent fields in Firebase

Target:

- Firebase user doc should be minimal
- Supabase profile should own profile stats from the beginning

## Current Write Paths

### Firebase writes affecting persistent data

- [`views/Auth.tsx`](../views/Auth.tsx): writes `stars`, `title`, `corrects`, `wins`
- [`views/Play.tsx`](../views/Play.tsx): writes `corrects`, `stars`, `title`, `wins`
- [`context/AuthContext.tsx`](../context/AuthContext.tsx): syncs Firebase stats into Supabase
- [`context/MultiplayerContext.tsx`](../context/MultiplayerContext.tsx): reads Firebase stats to populate room player snapshots

### Supabase writes affecting persistent data

- [`context/AuthContext.tsx`](../context/AuthContext.tsx): creates/migrates profile rows
- [`components/ProfileModal.tsx`](../components/ProfileModal.tsx): updates avatar URL
- [`views/Shop.tsx`](../views/Shop.tsx): purchase RPC is expected to update inventory and currency

## Migration Strategy

This should be done in stages, not as a big rewrite.

### Stage 1

Make the ownership explicit in code and docs.

Steps:

1. stop treating Firebase `users` as persistent stat truth
2. document Firebase `stars` as legacy-only
3. stop adding new persistent stat logic to Firebase user docs

### Stage 2

Make Supabase the read source for persistent profile data.

Steps:

1. update `AuthContext` so `wins`, `corrects`, `title`, and nectar come from Supabase
2. keep Firebase reads only for identity fallback and username migration support

### Stage 3

Make room snapshots consume Supabase-backed stats.

Steps:

1. update `MultiplayerContext` to initialize room players from Supabase-backed `userData`
2. remove fresh Firebase stat fetches used for join/create flows

### Stage 4

Move persistent gameplay rewards off Firebase `users`.

Steps:

1. replace gameplay writes to Firebase `users/{uid}`
2. update the trusted backend path for wins, corrects, nectar, and title
3. keep Firebase room player updates only for in-room display

### Stage 5

Retire legacy Firebase profile fields.

Steps:

1. stop writing `stars` entirely
2. stop depending on Firebase `users.corrects`, `users.wins`, and `users.title`
3. simplify `AuthContext`

## What Not To Change Yet

- room player `score`, `wins`, and `corrects` snapshots for gameplay UI
- Firebase `usernames` lookup used by username login
- social features already backed by Supabase

## Success Criteria

The migration is complete when:

- persistent profile fields come from Supabase only
- room-local gameplay values stay in Firebase only
- `AuthContext` no longer has to reconcile two persistent stat sources
- leaderboard, profile modal, header, and gameplay all agree on player progression values

## Immediate Next Coding Task

The next code step should be:

1. add tests around the Supabase-backed progression path
2. keep Firebase room state separate from profile progression logic during future `Play.tsx` refactors
3. remove the client-side fallback once every environment has the required RPCs
