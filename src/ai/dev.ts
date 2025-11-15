
import { config } from 'dotenv';
config();

import '@/ai/flows/session-summaries.ts';
import '@/ai/flows/generate-player-bio.ts';
import '@/ai/flows/transcribe-audio.ts';
import '@/ai/flows/extract-session-details.ts';
import '@/ai/flows/get-game-title-from-image.ts';
import '@/ai/flows/select-game-from-images.ts';
import '@/ai/flows/generate-legendary-card.ts';
import '@/ai/flows/generate-fantasy-portrait.ts';
