# Architecture

## Overview

HiveSpell is a client-side web application built with React, TypeScript, and Vite. The project uses a flat root-level layout rather than a `src/` directory.

The app combines:

- Firebase Authentication for sign-in
- Firebase Realtime Database for live multiplayer state
- Supabase for profile-oriented application data and storage

## Application Shell

The app entry flow is:

- [`index.tsx`](../index.tsx) mounts the app
- [`App.tsx`](../App.tsx) composes providers and routes

Providers are mounted in this order:

1. `AuthProvider`
2. `SettingsProvider`
3. `MultiplayerProvider`

This order matters because multiplayer features depend on authenticated user data and settings are expected globally.

## Routing

Current routes:

- `/` - home screen
- `/auth` - sign in and registration
- `/lobby` - protected lobby for room creation and matchmaking
- `/play/:mode` - protected gameplay route
- `*` - fallback 404 route

Protected access is enforced in [`App.tsx`](../App.tsx) through `ProtectedRoute`.

## Main Areas

### Authentication

[`context/AuthContext.tsx`](../context/AuthContext.tsx) is responsible for:

- listening to Firebase auth state
- loading user data
- syncing profile-related data needed by the UI
- exposing the current user and profile to the rest of the app

### Settings And Themes

[`context/SettingsContext.tsx`](../context/SettingsContext.tsx) controls:

- TTS volume
- typing SFX volume
- theme selection
- lightweight local persistence through `localStorage`

Theme colors are applied through CSS variables and Tailwind v4 theme tokens defined in [`styles.css`](../styles.css).

### Multiplayer

[`context/MultiplayerContext.tsx`](../context/MultiplayerContext.tsx) coordinates:

- room creation
- room joining
- leaving rooms
- public matchmaking
- live room subscription

Low-level Firebase room operations live in [`services/multiplayerService.ts`](../services/multiplayerService.ts).

### Gameplay

[`views/Play.tsx`](../views/Play.tsx) is the main gameplay surface and currently owns:

- room state synchronization
- round timing
- turn management
- disconnect handling
- intermission flow
- in-room chat and player list UI
- input syncing and answer submission

This file is intentionally called out because it is the most complex part of the project and a likely area for future refactoring.

### Game Logic

[`services/gameService.ts`](../services/gameService.ts) contains shared gameplay utilities such as:

- answer checking
- spelling normalization
- homophone support
- audio playback
- definition lookup
- title calculation

Word banks and local definitions live in [`data/words.ts`](../data/words.ts).

### Social Features

Social features are split across reusable UI and service modules:

- [`components/ProfileModal.tsx`](../components/ProfileModal.tsx)
- [`components/FriendsPanel.tsx`](../components/FriendsPanel.tsx)
- [`components/ChatPanel.tsx`](../components/ChatPanel.tsx)
- [`components/NotificationBell.tsx`](../components/NotificationBell.tsx)
- [`services/friendService.ts`](../services/friendService.ts)
- [`services/messageService.ts`](../services/messageService.ts)
- [`services/notificationService.ts`](../services/notificationService.ts)

## Directory Notes

Important root-level folders:

- `components/` - shared UI pieces
- `context/` - React context providers
- `data/` - game data such as word banks
- `services/` - Firebase and Supabase-facing logic
- `types/` - shared TypeScript interfaces
- `views/` - page-level components
- `public/` - static assets
- `.github/workflows/` - CI/CD workflows

## Design Notes

- The project uses Tailwind CSS v4 in CSS-first mode
- The runtime theme system relies on CSS custom properties
- The current implementation favors directness and fast iteration over strict layering

## Recommended Future Improvements

- split gameplay logic in [`views/Play.tsx`](../views/Play.tsx) into dedicated hooks and modules
- document backend schema and operational expectations more formally
- add automated tests for core game logic and room flow
