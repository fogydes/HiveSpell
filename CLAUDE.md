# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HiveSpell is a real-time multiplayer spelling bee game. Players hear audio of a word and must type it correctly. Features include public/private rooms, live ghost typing, turn-based gameplay, streak multipliers, and host migration.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build (output: dist/)
npm run preview   # Preview production build
firebase deploy   # Deploy to Firebase Hosting
```

No lint or test scripts are currently configured.

## Architecture

### Flat Source Layout

Source files live at the **project root** — there is no `src/` directory. The path alias `@/` maps to the project root (configured in both `tsconfig.json` and `vite.config.ts`).

### Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (CSS-first config via `@theme` directive in `styles.css`)
- **Firebase**: Authentication (email/password, Google) + Realtime Database (rooms, users, chat, presence)
- **Supabase**: User profiles (nectar/currency, inventory, leaderboard), audio file storage (`word-audios` bucket)

### Dual Backend

Firebase and Supabase serve different purposes and both are required:
- `firebase.ts` — initializes Firebase app, exports `auth` and `db`
- `services/supabase.ts` — initializes Supabase client, exports `supabase`
- `context/AuthContext.tsx` — handles auth via Firebase, then syncs/migrates user data to Supabase profiles. The `stars` field is deprecated in favor of `nectar`.

### Context Providers (wrap the app in this order)

1. **AuthProvider** (`context/AuthContext.tsx`) — Firebase auth state, user profile data (merged from Firebase + Supabase)
2. **SettingsProvider** (`context/SettingsContext.tsx`) — TTS volume, SFX volume, theme selection (4 themes: hive, royal, ice, forest). Themes work via CSS custom properties on `:root`.
3. **MultiplayerProvider** (`context/MultiplayerContext.tsx`) — Room lifecycle (create/join/leave), real-time room subscription, player list

### Routing (`App.tsx`)

- `/` — Home (public)
- `/auth` — Auth page (public)
- `/lobby` — Lobby (protected, requires auth)
- `/play/:mode` — Game play (protected, mode = difficulty tier)
- `*` — 404

### Key Services

- **`services/gameService.ts`** — Homophone handling, answer checking with spelling variant normalization (US/UK), audio playback (Supabase MP3 → browser TTS fallback), definitions, title calculation
- **`data/words.ts`** — Word banks (8 difficulty tiers: baby → polymath + omniscient), `wordBank`, `MODE_ORDER`, `getWordDifficulty`, `LOCAL_DEFINITIONS`. Exports are re-exported from `gameService.ts` for convenience.
- **`services/multiplayerService.ts`** — Firebase RTDB room CRUD, player join/leave with `onDisconnect` handlers, public room matchmaking
- **`services/friendService.ts`**, **`services/messageService.ts`**, **`services/notificationService.ts`** — Social features

### Database Structure (Firebase RTDB)

Key nodes defined in `database.rules.json`: `rooms/`, `users/`, `presence/`, `usernames/`, `chat/`

### Types

`types/multiplayer.ts` — `Player`, `GameSettings`, `GameState`, `Room` interfaces

### Theming

Tailwind v4 CSS-first approach: custom colors in `styles.css` via `@theme` reference CSS variables (`--bg-app`, `--primary`, etc.). `SettingsContext` applies theme by setting CSS vars on `document.documentElement`. When adding new theme-aware colors, add them to both the `@theme` block and the `THEMES` map in `SettingsContext.tsx`.

## Environment Variables

Copy `.env.template` to `.env.local`. All vars are `VITE_`-prefixed for Vite exposure:
- `VITE_FIREBASE_*` — Firebase config (API key, auth domain, project ID, database URL, etc.)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase config
- `GEMINI_API_KEY` — Exposed as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` via Vite define

## CI/CD

GitHub Actions (`.github/workflows/`) deploy to Firebase Hosting on push to `main`. All env vars are injected from GitHub Secrets. Dependabot is configured for npm updates.
