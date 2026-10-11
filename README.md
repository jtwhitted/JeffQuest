# Jeff Quest! - Your AI-Powered Board Game Companion

Jeff Quest! is a modern, web-based application designed to be the ultimate companion for board game enthusiasts. It allows you to meticulously track your game collection, log your play sessions, and see detailed statistics and rankings for your players.

Powered by advanced AI, Jeff Quest! goes beyond simple tracking to offer unique, engaging, and helpful features that enhance your gaming experience.

## Key Features:

*   **Game Library Management:**
    *   Add games to your collection by searching the massive BoardGameGeek (BGG) database.
    *   Use your camera to scan a game's box art, and let the AI identify the game and add it for you.
    *   Manually add custom or obscure games not found on BGG.

*   **Session Logging:**
    *   Log detailed information about each play session, including players, scores, winner or cooperative results, and play duration.
    *   **AI-Powered Audio Logging:** Simply record a voice note summarizing your session, and the AI will transcribe it and automatically populate the log form for you.

*   **AI-Powered Insights & Fun:**
    *   **Game Night Planner:** An AI "Game Sommelier" suggests the perfect game to play from your collection based on the players present, available time, and the "vibe" you're going for.
    *   **Rules Wizard:** Upload PDF rulebooks for your games. You can then ask the AI assistant questions about the rules (by voice or text) and get instant, cited answers.
    *   **Session Summaries:** Generate quick, tweet-sized summaries or detailed, narrative-style match reports for any logged session.
    *   **Legendary Player Cards:** Create epic, fantasy-style "Legendary Player Cards" for your friends, complete with a custom title and a heroic biography based on their gaming stats.
    *   **Custom Dashboard Widgets:** Ask the AI a question about your data (e.g., "Chart my wins vs losses per player") to generate and save custom data visualizations on your dashboard.

*   **Data & Statistics:**
    *   View a central dashboard with key stats like your most-played game and top player.
    *   See detailed pages for each game and player, showing their complete history, win rates, and more.
    *   Import your existing collection and play history directly from your BoardGameGeek account.

This application is built with a modern tech stack, including Next.js, React, and Genkit for its generative AI capabilities, providing a fast, responsive, and intelligent user experience.

## Publishing Your App

Before you publish this application, you will need to set up an environment variable for the generative AI features to work.

### Required Environment Variables

*   **`GEMINI_API_KEY`**: Your API key for the Google AI services. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

Create a `.env.local` file in the root of your project and add your key:

```
GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

When you deploy to a hosting provider, make sure to set this environment variable in their "secrets" or "environment variables" configuration panel.

### Firestore Setup

Data (games, players, sessions, dashboard insights) is stored in Firestore on the Firebase project `studio-645902535-c7b43`, via the Admin SDK (`src/lib/firebase-admin.ts`).

**Deployed on Firebase App Hosting:** no setup needed — the backend's own service account is used automatically.

**Local development:** generate a service account key (Firebase Console → Project Settings → Service Accounts → Generate new private key) and add its fields to `.env.local`:

```
FIREBASE_PROJECT_ID=studio-645902535-c7b43
FIREBASE_CLIENT_EMAIL="...@studio-645902535-c7b43.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**One-time data migration:** to copy the existing `src/data/*.json` records into Firestore, run:

```
npm run migrate:firebase
```

This is safe to re-run; it overwrites documents by the same `id` rather than duplicating them.