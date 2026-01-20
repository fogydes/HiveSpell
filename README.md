# HiveSpell

HiveSpell is a real-time multiplayer spelling bee game where players compete in a shared arena. It differentiates itself with a focus on competitive audio-based gameplay, where accurate typing and speed are essential.

The project is built with React 19, TypeScript, and Firebase.

## Overview

Unlike standard typing tests that show you the text, HiveSpell plays an audio clip of a word that you must type correctly. The game uses a hybrid audio engine that attempts to play high-quality recordings first, falling back to browser-based Text-to-Speech if necessary.

The multiplayer experience allows for public lobbies or private rooms with friends. As players type, their progress (ghost typing) and Words Per Minute (WPM) are synced in real-time to all other players in the room.

## Key Features

**Multiplayer Gameplay**

- **Public & Private Rooms:** Join global lobbies or create private rooms with shareable codes.
- **Live Sync:** See other players' typing progress and WPM in real-time.
- **Turn-Based System:** Players take turns solving words. If a player disconnects, the game automatically handles the turn transition.
- **Host Migration:** If the room host disconnects, the driver role automatically migrates to the next available player, ensuring the game continues without interruption.

**Audio Engine**

- **Hybrid Playback:** The game checks for a high-quality audio file for each word.
- **Fallback System:** If an audio file isn't found, it seamlessly uses the Web Speech API.
- **Deduplication:** Creating a consistent audio experience across different devices and network conditions.

**Competitive Mechanics**

- **Streak System:** Correct answers build a room-wide streak multiplier.
- **Persistent Stats:** Tracks your total correct words and wins across sessions.
- **Difficulty Tiers:** ranges from simple words ("Baby") to complex vocabulary ("Polymath").

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Realtime Database, Authentication, Hosting)
- **Testing:** Vitest

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/fogydes/HiveSpell.git
   cd HiveSpell
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

## Deployment

The project is configured for Firebase Hosting.

```bash
npm run build
firebase deploy
```

## Contributing

Contributions are welcome. Feel free to open an issue or submit a pull request if you have ideas for improvements or new features.

## License

Distributed under the GNU General Public License v3.0. See `LICENSE` for more information.
