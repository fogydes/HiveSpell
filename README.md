# HiveSpell

HiveSpell is a real-time multiplayer spelling game built around audio-first play. Players hear a word, type what they think they heard, and compete live in shared rooms with persistent progression and social features.

## Features

- Public matchmaking and private room codes
- Turn-based multiplayer spelling rounds
- Audio-first gameplay with fallback speech playback
- Persistent player profiles, stats, and progression
- Friends, notifications, and direct messages

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Firebase
- Supabase

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

The app expects environment variables for Firebase and Supabase configuration.

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

- `npm run dev` - start the development server
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally

## Documentation

Project documentation lives in [`docs/`](./docs/README.md).

- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Development guide: [`docs/development.md`](./docs/development.md)
- Gameplay guide: [`docs/gameplay.md`](./docs/gameplay.md)
- Backend guide: [`docs/backend.md`](./docs/backend.md)
- Supabase contracts: [`docs/supabase.md`](./docs/supabase.md)
- Deployment guide: [`docs/deployment.md`](./docs/deployment.md)

## Contributing

Contributions are welcome. If you want to improve HiveSpell, start with [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow, conventions, and suggested areas to help.

## Security

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
