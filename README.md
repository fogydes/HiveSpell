# HiveSpell

HiveSpell is a real-time multiplayer spelling game built around audio-first play. Players hear a word, type what they think they heard, and compete live in shared rooms with persistent progression and social features.

## Features

- Public matchmaking and private room codes
- Turn-based multiplayer spelling rounds with automatic stale room cleanup
- Audio-first gameplay with Supabase-hosted word recordings and TTS fallback
- Persistent player profiles, stats, and progression via server-owned RPCs
- Friends, notifications, and secure real-time direct messages
- Themed visual packages with cursor effects and customization
- In-game shop with nectar economy and cosmetic unlocks

## Tech Stack

- React 19 + TypeScript (strict mode)
- Vite 8
- Tailwind CSS v4 (CSS-first mode)
- Firebase (Auth, Realtime Database, Hosting)
- Supabase (Profiles, Social, Storage, RPCs)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.template` and fill in your project values.

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open:

   ```text
   http://localhost:3000
   ```

## Environment Variables

The app expects environment variables for Firebase and Supabase configuration. See `.env.template` for the full list.

Firebase:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_DATABASE_URL=
```

Supabase:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Scripts

- `npm run dev` — start the development server
- `npm run typecheck` — run TypeScript strict-mode type checking
- `npm run test` — run Vitest unit tests
- `npm run build` — build the production bundle
- `npm run preview` — preview the production build locally

## Project Structure

```
├── App.tsx                 # Root component, providers, routes
├── components/             # Shared UI (chat, play, modals)
├── context/                # React context providers (Auth, Multiplayer, Settings, Toast)
├── data/                   # Game data (word banks, customization catalog, themes)
├── docs/                   # Project documentation
├── hooks/                  # Custom React hooks (gameplay, chat, lifecycle)
├── services/               # Backend service layer (Firebase, Supabase, game logic)
├── types/                  # TypeScript interfaces
├── utils/                  # Shared utilities (logger)
├── views/                  # Page-level components (Home, Auth, Lobby, Play, Shop, Stash)
└── public/                 # Static assets (favicons, themes)
```

## Documentation

Project documentation lives in [`docs/`](./docs/README.md).

- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Development guide: [`docs/development.md`](./docs/development.md)
- Backend guide: [`docs/backend.md`](./docs/backend.md)
- Gameplay guide: [`docs/gameplay.md`](./docs/gameplay.md)
- Supabase contracts: [`docs/supabase.md`](./docs/supabase.md)
- Deployment guide: [`docs/deployment.md`](./docs/deployment.md)
- Architecture roadmap: [`docs/roadmap.md`](./docs/roadmap.md)
- Design roadmap: [`docs/experience-roadmap.md`](./docs/experience-roadmap.md)
- Security & quality plan: [`docs/improvement-plan.md`](./docs/improvement-plan.md)
- Design improvement plan: [`docs/design-improvement-plan.md`](./docs/design-improvement-plan.md)

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow, conventions, and suggested areas to help.

## Security

- Firebase Realtime Database rules enforce per-user write access, chat validation, and field-level schema enforcement
- Supabase progression uses server-owned RPCs (no client-side stat manipulation)
- Hosting includes CSP, X-Frame-Options, and security headers
- Room codes use cryptographic randomness

If you discover a security issue, please read [`SECURITY.md`](./SECURITY.md) before opening a public issue.

## Deployment

The app is deployed with Firebase Hosting. CI is configured through GitHub Actions for preview and production deployments.

Manual deploy:

```bash
npm run build
firebase deploy
```

## License

Distributed under the GNU General Public License v3.0. See [`LICENSE`](./LICENSE).
