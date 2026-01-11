# 🐝 HiveSpell

**HiveSpell** is a high-octane, web-based spelling game where speed meets precision. Designed for competitive practice, HiveSpell challenges players to spell increasingly difficult words under intense time pressure with ultra-accurate performance tracking.

---

## 🚀 Key Features

* **Burst WPM Engine**: Experience a professional-grade typing metric that calculates your speed per individual word, providing instant feedback on your "burst" velocity.
* **ElevenLabs AI Integration**: Powered by high-fidelity text-to-speech (TTS) for crystal-clear word pronunciation and an immersive auditory experience.
* **Competitive Progression**: Earn Stars for every correct word to increase your rank and unlock new titles.
* **Adaptive Difficulty**: Progress through eight tiers of challenge: **Baby**, **Cakewalk**, **Learner**, **Intermediate**, **Heated**, **Genius**, **Omniscient**, and **Polymath**.
* **Fire Streaks**: Maintain your accuracy to ignite visual streak effects and maximize your star earnings.

---

## 🧪 Advanced Performance Metrics

HiveSpell utilizes a precision-timed **Burst WPM** formula. This ensures that your speed is calculated only during the time you are actually typing, excluding system delays or voice-over time.

### The "Fair-Start" Timer
To ensure competitive fairness, the game implements an **800ms animation buffer**. The WPM clock only starts the moment the input field is focused and the word is ready to be typed, ignoring the time taken for the AI to speak or UI transitions.

### The Formula
The game uses a **4-character standard** for word normalization (optimized for high-speed spelling):

$$WPM = \text{round} \left( \frac{\text{Word Length} / 4}{\text{Time Taken in Seconds} / 60} \right)$$

*Example: Typing a 6-letter word in 0.9 seconds results in a burst speed of **100 WPM**.*

---

## 🛠️ Tech Stack

* **Frontend**: React + TypeScript
* **Styling**: Tailwind CSS (Glassmorphism & High-Contrast UI)
* **Backend**: Firebase (Authentication & Real-time Database)
* **Audio**: ElevenLabs API (Neural Text-to-Speech)
* **Deployment**: Firebase Hosting + GitHub Actions CI/CD

---

## 🚦 Getting Started

### Prerequisites
* Node.js (v18+)
* Firebase CLI
* ElevenLabs API Key

### Installation

1.  **Clone the repository**:
    ```bash
    git clone [https://github.com/fogydes/HiveSpell.git](https://github.com/fogydes/HiveSpell.git)
    cd HiveSpell
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Update `src/services/gameService.ts` with your ElevenLabs API key and configure `src/firebase.ts` with your project credentials.

4.  **Local Development**:
    ```bash
    npm run dev
    ```

5.  **Build and Deploy**:
    ```bash
    npm run build
    firebase deploy
    ```

---

## 🎮 How to Play

1.  **Login**: Create an account to sync your stars and titles across devices.
2.  **Choose Difficulty**: Select a mode from the Lobby. Lower modes use simpler words; higher modes test the limits of your vocabulary.
3.  **Listen & Type**: Wait for the 800ms "Fair-Start" delay, listen to the word, and type it immediately.
4.  **Beat the Clock**: You have 15 seconds per word. If the timer hits zero, the round ends and your streak resets.
5.  **Analyze**: Review your session WPM and accuracy to improve your spelling speed.

---

## 📄 License
This project is developed for educational and competitive practice purposes.

---
