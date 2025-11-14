
'use server';
/**
 * @fileOverview An AI flow to generate a legendary player card with a title and bio.
 *
 * - generateLegendaryCard - A function that takes player details and generates card content.
 * - GenerateLegendaryCardInput - The input type for the generateLegendaryCard function.
 * - GenerateLegendaryCardOutput - The return type for the generateLegendaryCard function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateLegendaryCardInputSchema = z.object({
  name: z.string().describe('The name of the player.'),
  gamesPlayed: z.number().describe('The total number of games the player has played.'),
  wins: z.number().describe('The total number of games the player has won.'),
  winRate: z.number().describe('The win rate of the player as a percentage (e.g., 50 for 50%).'),
  favoriteGame: z.string().optional().describe("The name of the player's most played game."),
});
export type GenerateLegendaryCardInput = z.infer<typeof GenerateLegendaryCardInputSchema>;

const GenerateLegendaryCardOutputSchema = z.object({
  title: z.string().describe('An epic, fantasy-style title for the player.'),
  bio: z.string().describe('A short, 1-2 sentence biography for the player in an epic style.'),
});
export type GenerateLegendaryCardOutput = z.infer<typeof GenerateLegendaryCardOutputSchema>;


export async function generateLegendaryCard(input: GenerateLegendaryCardInput): Promise<GenerateLegendaryCardOutput> {
  return generateLegendaryCardFlow(input);
}

const generateCardContentPrompt = ai.definePrompt({
    name: 'generatePlayerCardContentPrompt',
    input: { schema: GenerateLegendaryCardInputSchema },
    output: { schema: GenerateLegendaryCardOutputSchema },
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are a fantasy world scribe, granting epic titles and writing short legends for tabletop gamers.
    Based on the player's stats and favorite game, create:
    1. A short, epic-sounding title (e.g., "The Unyielding Baron", "Mistress of the Dice"). Do NOT include the player's actual name in the title itself.
    2. A 1-2 sentence biography about their gaming legacy. Don't just list stats; build a character.

    **Player Name:** {{{name}}}
    **Win Rate:** {{{winRate}}}%
    **Favorite Game:** {{{favoriteGame}}}
    
    Generate only the structured JSON output with a 'title' and 'bio'.`,
});

const generateLegendaryCardFlow = ai.defineFlow(
  {
    name: 'generateLegendaryCardFlow',
    inputSchema: GenerateLegendaryCardInputSchema,
    outputSchema: GenerateLegendaryCardOutputSchema,
  },
  async (input) => {
    const { output } = await generateCardContentPrompt(input);
    
    if (!output?.title || !output?.bio) {
      throw new Error('The AI failed to generate the card content.');
    }
    
    return output;
  }
);

