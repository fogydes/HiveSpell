# HiveSpell - Project Context

## Project Overview

**HiveSpell** is a React-based Single Page Application (SPA) designed as a progressive spelling bee game. Users can play through various difficulty levels, track their progress, and improve their spelling skills. The application leverages Firebase for backend services including authentication and data storage.

### Tech Stack
*   **Frontend:** React (v19), TypeScript, Vite
*   **Routing:** React Router DOM (HashRouter)
*   **Styling:** Tailwind CSS (inferred from utility classes)
*   **Backend / Services:** Firebase (Auth, Realtime Database, Hosting)
*   **Audio:** Native HTML5 Audio with SpeechSynthesis (TTS) fallback

## Architecture & Key Components

### Directory Structure
*   `src/components`: Reusable UI components (e.g., `Header`).
*   `src/context`: React Context providers for global state management (`AuthContext`, `SettingsContext`).
*   `src/services`: Core business logic.
    *   `gameService.ts`: Contains word lists, difficulty levels, audio playback logic, and answer validation.
*   `src/views`: Main page components (`Home`, `Auth`, `Lobby`, `Play`).
*   `public/audio`: Static assets for word pronunciation.

### Core Logic (`gameService.ts`)
*   **Word Lists:** Hardcoded lists ranging from "Baby" to "Super Hard" difficulty.
*   **Audio:** Tries to play a local MP3 first (e.g., `/audio/word.mp3`). If it fails or doesn't exist, it falls back to the browser's `SpeechSynthesis` API.
*   **Validation:** Supports homophones and alternative spellings (e.g., British vs. American English).

## Development Workflow

### Prerequisites
*   Node.js (v18+ recommended)
*   npm

### Commands
*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Start Development Server:**
    ```bash
    npm run dev
    ```
*   **Build for Production:**
    ```bash
    npm run build
    ```
*   **Preview Production Build:**
    ```bash
    npm run preview
    ```

### Firebase Configuration
The project uses Firebase. Ensure you have the necessary credentials if you need to interact with backend services locally.
*   **Config File:** `firebase.ts` initializes the app, auth, and database.
*   **Hosting:** configured in `firebase.json`, serving the `dist` directory.

## Conventions
*   **Naming:** PascalCase for components (`Header.tsx`), camelCase for functions and variables.
*   **Routing:** Protected routes are wrapped in a `ProtectedRoute` component that checks for authentication.
*   **State:** Use Context API for global state (User session, Game settings).
