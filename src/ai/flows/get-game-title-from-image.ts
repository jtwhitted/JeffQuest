'use server';
/**
 * @fileOverview An AI flow to extract board game details from an image using BGG API.
 *
 * - getGameDetailsFromImage - A function that takes an image of a game box and returns its details.
 * - GetGameDetailsInput - The input type for the getGameDetailsFromImage function.
 * - GetGameDetailsOutput - The return type for the getGameDetailsFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchBgg, getBggGameDetails } from './bgg-tools';

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

const titlePrompt = ai.definePrompt({
  name: 'getGameTitlePrompt',
  input: {schema: GetGameDetailsInputSchema},
  output: {schema: z.object({ title: z.string() })},
  prompt: `You are an expert at identifying board games from images of their boxes.
Analyze the provided image and extract only the main title of the board game.

Image: {{media url=photoDataUri}}`,
});

const getGameDetailsFlow = ai.defineFlow(
  {
    name: 'getGameDetailsFlow',
    inputSchema: GetGameDetailsInputSchema,
    outputSchema: GetGameDetailsOutputSchema,
    tools: [searchBgg, getBggGameDetails],
  },
  async input => {
    // Step 1: Get the title from the image
    const { output: titleOutput } = await titlePrompt(input);
    if (!titleOutput?.title) {
        throw new Error('Could not determine game title from image.');
    }
    const title = titleOutput.title;

    // Step 2: Search BGG for the game ID
    const searchResults = await searchBgg({ query: title });
    if (!searchResults || searchResults.length === 0) {
        throw new Error(`No results found on BoardGameGeek for "${title}".`);
    }
    const gameId = searchResults[0].id; // Assume the first result is the correct one

    // Step 3: Get detailed game info from BGG
    const gameDetails = await getBggGameDetails({ id: gameId });

    // Step 4: Map BGG complexity to our difficulty enum
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Intermediate';
    if (gameDetails.complexity < 2) {
        difficulty = 'Beginner';
    } else if (gameDetails.complexity >= 2 && gameDetails.complexity < 3) {
        difficulty = 'Intermediate';
    } else if (gameDetails.complexity >= 3 && gameDetails.complexity < 4) {
        difficulty = 'Advanced';
    } else if (gameDetails.complexity >= 4) {
        difficulty = 'Expert';
    }

    return {
        title: gameDetails.name,
        category: gameDetails.category,
        minPlayers: gameDetails.minPlayers,
        maxPlayers: gameDetails.maxPlayers,
        difficulty: difficulty,
    };
  }
);
