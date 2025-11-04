'use server';
/**
 * @fileOverview An AI flow to generate a humorous player biography.
 *
 * - generatePlayerBio - A function that takes player details and generates a bio.
 * - GeneratePlayerBioInput - The input type for the generatePlayerBio function.
 * - GeneratePlayerBioOutput - The return type for the generatePlayerBio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePlayerBioInputSchema = z.object({
  name: z.string().describe('The name of the player.'),
  avatarDataUri: z
    .string()
    .describe(
      "A photo of the player, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  gamesPlayed: z.number().describe('The total number of games the player has played.'),
  wins: z.number().describe('The total number of games the player has won.'),
  winRate: z.number().describe('The win rate of the player as a percentage (e.g., 50 for 50%).'),
});
export type GeneratePlayerBioInput = z.infer<typeof GeneratePlayerBioInputSchema>;

const GeneratePlayerBioOutputSchema = z.object({
  bio: z.string().describe('A short, humorous biography of the player.'),
});
export type GeneratePlayerBioOutput = z.infer<typeof GeneratePlayerBioOutputSchema>;

export async function generatePlayerBio(input: GeneratePlayerBioInput): Promise<GeneratePlayerBioOutput> {
  return generatePlayerBioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePlayerBioPrompt',
  input: { schema: GeneratePlayerBioInputSchema },
  output: { schema: GeneratePlayerBioOutputSchema },
  prompt: `You are a witty and sarcastic sports commentator, but for board games.
Your task is to write a short, humorous player bio for a tabletop gamer named {{{name}}}.
Use their photo and game stats to create a funny narrative. Don't just list the stats; build a character around them.
Be creative, a little sassy, and gently roast them if their stats are low, or build them up as a mythical figure if they are high.
Analyze their expression in the photo for inspiration.

**Player Name:** {{{name}}}
**Photo:** {{media url=avatarDataUri}}

**Stats:**
- Games Played: {{{gamesPlayed}}}
- Wins: {{{wins}}}
- Win Rate: {{{winRate}}}%

Generate a bio that is 2-3 sentences long.
`,
});

const generatePlayerBioFlow = ai.defineFlow(
  {
    name: 'generatePlayerBioFlow',
    inputSchema: GeneratePlayerBioInputSchema,
    outputSchema: GeneratePlayerBioOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
