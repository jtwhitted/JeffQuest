'use server';
/**
 * @fileOverview An AI flow to extract board game details from an image.
 *
 * - getGameDetailsFromImage - A function that takes an image of a game box and returns its details.
 * - GetGameDetailsInput - The input type for the getGameDetailsFromImage function.
 * - GetGameDetailsOutput - The return type for the getGameDetailsFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetGameDetailsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a board game box, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GetGameDetailsInput = z.infer<typeof GetGameDetailsInputSchema>;

const GetGameDetailsOutputSchema = z.object({
  title: z.string().describe('The title of the board game identified in the image.'),
  category: z.string().describe('The main category or genre of the game (e.g., Strategy, Party, Family, RPG).'),
  minPlayers: z.number().describe('The minimum number of players for the game.'),
  maxPlayers: z.number().describe('The maximum number of players for the game.'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).describe('The estimated difficulty of the game.'),
});
export type GetGameDetailsOutput = z.infer<typeof GetGameDetailsOutputSchema>;

export async function getGameDetailsFromImage(input: GetGameDetailsInput): Promise<GetGameDetailsOutput> {
  return getGameDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getGameDetailsPrompt',
  input: {schema: GetGameDetailsInputSchema},
  output: {schema: GetGameDetailsOutputSchema},
  prompt: `You are an expert at identifying board games from images of their boxes.
Analyze the provided image and extract the following details:
- The main title of the board game.
- The primary category or genre.
- The minimum and maximum number of players.
- The estimated difficulty level (Beginner, Intermediate, Advanced, or Expert).

If a detail is not visible or cannot be determined, make a reasonable estimate based on the game's title and box art.

Image: {{media url=photoDataUri}}`,
});

const getGameDetailsFlow = ai.defineFlow(
  {
    name: 'getGameDetailsFlow',
    inputSchema: GetGameDetailsInputSchema,
    outputSchema: GetGameDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
