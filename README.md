# HiveSpell

### Represents the Competitive Multiplayer Spelling Bee

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=flat&logo=firebase)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🐝 Overview

**HiveSpell** is a fast-paced, real-time multiplayer spelling game designed to test your speed and accuracy. Players compete in a shared arena, listening to words pronounced by a specialized audio engine (combining high-quality recordings with a robust text-to-speech fallback) and typing them out before time runs out.

Inspired by competitive typing games and the intensity of spelling bees, HiveSpell features a sleek "Gamepass" aesthetic, persistent stats, and escalating difficulty tiers ranging from "Baby" to "Queen Bee".

## ✨ Features

- **🎮 Real-Time Multiplayer**:
  - Create **Public** lobbies to play with strangers.
  - Create **Private** rooms to challenge friends (Share specific Room Codes).
  - Live synchronization of player states, scores, and eliminations.

- **🔊 Advanced Audio Engine**:
  - **Hybrid Playback**: Prioritizes high-quality MP3 recordings for words.
  - **Robust Fallback**: Seamlessly switches to Browser Text-to-Speech (TTS) if audio files are missing or slow to load.
  - **Concurrency Control**: Custom `speakId` locking mechanism prevents double-audio glitches even on high-latency mobile networks.

- **🏆 Competitive Gameplay**:
  - **Streak System**: Build streaks to enter "Rampage Mode" (visual fire effects).
  - **WPM Tracking**: Real-time Words Per Minute calculation.
  - **Leaderboards**: Track "Corrects" and "Wins" persistent across sessions.
  - **Visual Feedback**: Pixel-art style "Word Correction" modal shows exactly what you typed vs. the correct spelling.

- **📱 Responsive Design**:
  - Fully optimized for Desktop and Mobile play.
  - Touch-friendly interfaces and virtual keyboards support.

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/) (via Vite)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Infrastructure**: [Firebase](https://firebase.google.com/)
  - **Authentication**: Email & Password Flow.
  - **Realtime Database**: Low-latency game state synchronization.
  - **Hosting**: Fast global content delivery.
- **Testing**: [Vitest](https://vitest.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/fogydes/HiveSpell.git
   cd HiveSpell
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file (or `.env.local`) with your Firebase credentials if running a custom instance:

   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ```

   _(Note: The project is currently configured to look for these variables)_

4. **Run Locally:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or the port shown in terminal).

## 📦 Deployment

This project is set up for **Firebase Hosting**.

1. **Build the project:**

   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   firebase deploy
   ```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
