# Development Guide

## Requirements

- Node.js 20 or newer recommended
- npm
- Firebase project configuration
- Supabase project configuration

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.template` to `.env.local`

3. Fill in the required Firebase and Supabase variables

4. Start the app:

   ```bash
   npm run dev
   ```

The Vite dev server runs on port `3000`.

## Type Checking And Build

Useful commands:

```bash
npx tsc --noEmit
npm run build
npm run preview
```

There is currently no dedicated lint or test script in `package.json`.

## Project Conventions

- Source files live at the repository root, not in `src/`
- The `@/` path alias maps to the project root
- React components are written in TypeScript and use function components
- Runtime theme values are applied through CSS variables

## Working In The Codebase

If you are new to the project, a good first reading path is:

1. [`App.tsx`](../App.tsx)
2. [`context/AuthContext.tsx`](../context/AuthContext.tsx)
3. [`context/MultiplayerContext.tsx`](../context/MultiplayerContext.tsx)
4. [`views/Lobby.tsx`](../views/Lobby.tsx)
5. [`views/Play.tsx`](../views/Play.tsx)

## Common Areas Of Work

### UI And Layout

- edit page-level screens in `views/`
- edit shared overlays and controls in `components/`
- update theme tokens in [`styles.css`](../styles.css) and [`context/SettingsContext.tsx`](../context/SettingsContext.tsx)

### Gameplay Changes

- room and live sync behavior usually touches [`context/MultiplayerContext.tsx`](../context/MultiplayerContext.tsx) and [`services/multiplayerService.ts`](../services/multiplayerService.ts)
- answer checking or audio behavior usually touches [`services/gameService.ts`](../services/gameService.ts)
- difficulty and vocabulary updates belong in [`data/words.ts`](../data/words.ts)

### Auth And Profile Changes

- authentication flow is in [`views/Auth.tsx`](../views/Auth.tsx)
- user session and profile hydration are in [`context/AuthContext.tsx`](../context/AuthContext.tsx)

## Current Development Risks

- [`views/Play.tsx`](../views/Play.tsx) is large and handles many responsibilities
- profile data is coordinated across more than one backend service
- social and shop features rely on external backend contracts not fully described inside the app code

## Before Opening A Pull Request

- run `npx tsc --noEmit`
- run `npm run build`
- test the changed user flow manually
- update docs if the behavior or setup changed
