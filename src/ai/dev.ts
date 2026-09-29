
import { config } from 'dotenv';
config();

import { genkit, ModelReference } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';


genkit({
  plugins: [
    googleAI(),
  ],
});

import '@/ai/flows/session-summaries.ts';
import '@/ai/flows/generate-player-bio.ts';
import '@/ai/flows/transcribe-audio.ts';
import '@/ai/flows/extract-session-details.ts';
import '@/ai/flows/get-game-title-from-image.ts';
import '@/ai/flows/select-game-from-images.ts';
import '@/ai/flows/generate-legendary-card.ts';
import '@/ai/flows/ask-rulebook.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/generate-dashboard-insight.ts';
import '@/ai/flows/suggest-game-night-flow.ts';
