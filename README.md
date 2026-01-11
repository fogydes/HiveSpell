# 🐝 HiveSpell

**HiveSpell** is a high-octane, web-based spelling game where speed meets precision. Inspired by competitive spelling formats like the Roblox *Spelling Bee*, HiveSpell challenges players to spell increasingly difficult words under intense time pressure.

---

## 🚀 Key Features

* **Burst WPM Logic**: Unlike traditional typing tests that measure speed over a full minute, HiveSpell calculates your **Burst Rate**—the speed of your typing for a single word.
* **ElevenLabs AI Voices**: Experience high-quality, ultra-realistic text-to-speech (TTS) for every word, ensuring clarity and immersion.
* **Real-time Star System**: Earn "Stars" for every correct word to level up your profile and climb the ranks.
* **Multiple Difficulties**: From **Baby** and **Cakewalk** to **Omniscient** and **Polymath**, there is a level for every spelling master.
* **Dynamic Streaks**: Build up your streak to ignite the "Fire" effect and prove your consistency.

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
* **Styling**: Tailwind CSS (Glassmorphism & High-Contrast Themes)
* **Backend**: Firebase (Authentication & Real-time Database)
* **Audio**: ElevenLabs API (Text-to-Speech)
* **Deployment**: Firebase Hosting + GitHub Actions

---

## 🚦 Getting Started

### Prerequisites
* Node.js (v18+)
* Firebase Account
* ElevenLabs API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone [https://github.com/fogydes/HiveSpell.git](https://github.com/fogydes/HiveSpell.git)
   cd HiveSpell
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up environment variables**: Create a ```.env``` file or update ```services/gameService.ts``` with your TTS API key(ElevenLabs AI is used in the project).
4. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

---

## 🎮 How to Play

1. **Login**: Use your account to keep track of your Stars.
2. **Select Mode**: Pick a difficulty that matches your skill level.
3. **Listen & Type**: A word will be spoken. Type it as fast as possible and hit ```Enter```.
4. **Beat the Cloak**: You have  the limited time per word. If the timer hits zero, you die and your streak resets!

---

## Licence
This project is for educational and competitive practice purposes.
