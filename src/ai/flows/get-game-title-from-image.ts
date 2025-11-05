'use server';
/**
 * @fileOverview An AI flow to extract board game details from an image.
 *
 * - getGameDetailsFromImage - A function that takes an image of a game box and returns its details.
 * - GetGameDetailsInput - The input type for the getGameDetailsFromimage function.
 * - GetGameDetailsOutput - The return type for the getGameDetailsFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { searchBgg, getBggGameDetails } from '@/lib/bgg';


const GetGameDetailsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a board game box, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GetGameDetailsInput = z.infer<typeof GetGameDetailsInputSchema>;

const GetGameDetailsOutputSchema = z.object({
  name: z.string().describe('The title of the board game identified in the image.'),
  category: z.string().describe('The main category or genre of the game (e.g., Strategy, Party, Family, RPG).'),
  mechanics: z.array(z.string()).describe("A list of the game's mechanics (e.g., 'Worker Placement', 'Deck Building')."),
  minPlayers: z.number().describe('The minimum number of players for the game.'),
  maxPlayers: z.number().describe('The maximum number of players for the game.'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).describe('The estimated difficulty of the game.'),
  yearPublished: z.number().optional().describe('The year the game was published.'),
  description: z.string().optional().describe('A brief description of the game.'),
  minPlaytime: z.number().optional().describe('The minimum playtime in minutes.'),
  maxPlaytime: z.number().optional().describe('The maximum playtime in minutes.'),
  rating: z.number().optional().describe('The average user rating from BGG (1-10).'),
  ratingCount: z.number().optional().describe('The number of ratings on BGG.'),
  complexity: z.number().optional().describe('The complexity or "weight" rating from BGG (1-5).'),
  designers: z.array(z.string()).optional().describe('The designers of the game.'),
  publishers: z.array(z.string()).optional().describe('The publishers of the game.'),
  imageUrl: z.string().optional().describe("A URL to the game's box art image."),
});
export type GetGameDetailsOutput = z.infer<typeof GetGameDetailsOutputSchema>;

export async function getGameDetailsFromImage(input: GetGameDetailsInput): Promise<GetGameDetailsOutput> {
  return getGameDetailsFlow(input);
}

const getGameTitlePrompt = ai.definePrompt({
    name: 'getGameTitlePrompt',
    input: { schema: GetGameDetailsInputSchema },
    output: { schema: z.object({ title: z.string() }) },
    prompt: `Analyze the provided image of a board game box and identify the main title of the game. Return only the title.
  
  Image: {{media url=photoDataUri}}`,
});


const getGameDetailsFlow = ai.defineFlow(
  {
    name: 'getGameDetailsFlow',
    inputSchema: GetGameDetailsInputSchema,
    outputSchema: GetGameDetailsOutputSchema,
  },
  async (input) => {
    
    // Step 1: Use AI to get the title from the image.
    const llmResponse = await getGameTitlePrompt(input);
    const title = llmResponse.output?.title;

    if (!title) {
        throw new Error("Could not determine game title from the image.");
    }
    
    // Step 2: Use the title to search BGG for a game ID.
    const bggId = await searchBgg(title);
    if (!bggId) {
        throw new Error(`Could not find a match for "${title}" on BoardGameGeek.`);
    }

    // Step 3: Use the BGG ID to get full details from the BGG API.
    const bggDetails = await getBggGameDetails(bggId);
    if (!bggDetails) {
        throw new Error(`Could not retrieve details for BGG ID ${bggId}.`);
    }

    // Combine AI and BGG data, preferring BGG data.
    return {
        name: bggDetails.name || title,
        category: bggDetails.category || 'Strategy',
        mechanics: bggDetails.mechanics || [],
        minPlayers: bggDetails.minPlayers || 1,
        maxPlayers: bggDetails.maxPlayers || 4,
        difficulty: 'Intermediate', // Default value
        yearPublished: bggDetails.yearPublished,
        description: bggDetails.description,
        minPlaytime: bggDetails.minPlaytime,
        maxPlaytime: bggDetails.maxPlaytime,
        rating: bggDetails.rating,
        ratingCount: bggDetails.ratingCount,
        complexity: bggDetails.complexity,
        designers: bggDetails.designers,
        publishers: bggDetails.publishers,
        imageUrl: bggDetails.imageUrl || '',
    };
  }
);
