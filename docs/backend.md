# Backend Guide

## Overview

HiveSpell uses two backend platforms with different responsibilities.

## Firebase Responsibilities

Firebase is used for live and session-oriented features:

- authentication
- usernames
- realtime room state
- player presence and participation
- in-room chat

Key local files:

- [`firebase.ts`](../firebase.ts)
- [`services/multiplayerService.ts`](../services/multiplayerService.ts)
- [`context/AuthContext.tsx`](../context/AuthContext.tsx)
- [`database.rules.json`](../database.rules.json)

## Supabase Responsibilities

Supabase is used for profile-oriented and social features:

- profile data
- persistent progression-related data
- leaderboard-facing profile information
- avatars and user-facing storage
- friendships
- direct messages
- notifications
- word audio storage

Key local files:

- [`services/supabase.ts`](../services/supabase.ts)
- [`services/friendService.ts`](../services/friendService.ts)
- [`services/messageService.ts`](../services/messageService.ts)
- [`services/notificationService.ts`](../services/notificationService.ts)
- [`components/ProfileModal.tsx`](../components/ProfileModal.tsx)

Detailed internal contract notes live in [`supabase.md`](./supabase.md).

## Authentication Model

Firebase is the primary authentication layer used by the web app. The authenticated Firebase user is then used to load and coordinate other profile-related data needed by the interface.

## Environment Configuration

The app expects:

- `VITE_FIREBASE_*` variables for Firebase
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See [`.env.template`](../.env.template).

## Realtime Notes

Multiplayer behavior depends on low-latency room updates. Contributors touching room flow should pay close attention to:

- room creation and join semantics
- disconnect behavior
- the active turn player
- intermission timing

## Operational Considerations

- Firebase Realtime Database rules are part of the application behavior and should be reviewed alongside gameplay changes
- profile-related changes often require validating both frontend behavior and backend schema expectations
- deployment depends on environment variables being present in GitHub Actions and hosting configuration

## Good Documentation Habits

Whenever you introduce a backend dependency:

- document the new environment variable if one is needed
- document any new service or storage expectation
- update deployment notes if CI or hosting needs to change
