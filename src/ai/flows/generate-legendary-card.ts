
'use server';
/**
 * @fileOverview An AI flow to generate a legendary player card with a stylized avatar and title.
 *
 * - generateLegendaryCard - A function that takes player details and generates a card.
 * - GenerateLegendaryCardInput - The input type for the generateLegendaryCard function.
 * - GenerateLegendaryCardOutput - The return type for the generateLegendaryCard function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Part } from 'genkit';

const GenerateLegendaryCardInputSchema = z.object({
  name: z.string().describe('The name of the player.'),
  avatarDataUri: z
    .string()
    .describe(
      "A photo of the player, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  gamesPlayed: z.number().describe('The total number of games the player has played.'),
  wins: z.number().describe('The total number of games the player has won.'),
  winRate: z.number().describe('The win rate of the player as a percentage (e.g., 50 for 50%).'),
  favoriteGame: z.string().optional().describe('The name of the player\'s most played game.'),
});
export type GenerateLegendaryCardInput = z.infer<typeof GenerateLegendaryCardInputSchema>;

const GenerateLegendaryCardOutputSchema = z.object({
  title: z.string().describe('An epic, fantasy-style title for the player.'),
  stylizedAvatarDataUri: z.string().describe('A new, AI-generated avatar image for the player as a data URI.'),
});
export type GenerateLegendaryCardOutput = z.infer<typeof GenerateLegendaryCardOutputSchema>;


export async function generateLegendaryCard(input: GenerateLegendaryCardInput): Promise<GenerateLegendaryCardOutput> {
  return generateLegendaryCardFlow(input);
}

const generateTitlePrompt = ai.definePrompt({
    name: 'generatePlayerTitlePrompt',
    input: { schema: GenerateLegendaryCardInputSchema.pick({ name: true, winRate: true, favoriteGame: true }) },
    output: { schema: z.object({ title: z.string() }) },
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are a fantasy world scribe, granting epic titles to legendary tabletop gamers.
    Based on the player's name, win rate, and favorite game, create a short, epic-sounding title.
    For example: "The Unyielding Baron of Catan" or "Mistress of the Dice".

    **Player Name:** {{{name}}}
    **Win Rate:** {{{winRate}}}%
    **Favorite Game:** {{{favoriteGame}}}
    
    Generate only the title.`,
});

const generateLegendaryCardFlow = ai.defineFlow(
  {
    name: 'generateLegendaryCardFlow',
    inputSchema: GenerateLegendaryCardInputSchema,
    outputSchema: GenerateLegendaryCardOutputSchema,
  },
  async (input) => {
    // Generate the title and the image in parallel
    const [titleResponse, imageResponse] = await Promise.all([
      generateTitlePrompt({
        name: input.name,
        winRate: input.winRate,
        favoriteGame: input.favoriteGame,
      }),
      ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: [
          { media: { url: input.avatarDataUri } },
          { text: 'Transform this photo into a heroic fantasy character portrait in the style of a "Magic: The Gathering" card illustration. The output should be just the image.' },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    ]);

    const title = titleResponse.output?.title;
    const stylizedAvatarDataUri = imageResponse.media?.url;
    
    if (!title || !stylizedAvatarDataUri) {
      throw new Error('The AI failed to generate either the title or the stylized avatar.');
    }
    
    return { title, stylizedAvatarDataUri };
  }
);

