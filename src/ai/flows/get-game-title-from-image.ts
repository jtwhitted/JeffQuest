'use server';
/**
 * @fileOverview An AI flow to extract board game details from an image using BGG API.
 *
 * - getGameDetailsFromImage - A function that takes an image of a game box and returns its details.
 * - GetGameDetailsInput - The input type for the getGameDetailsFromimage function.
 * - GetGameDetailsOutput - The return type for the getGameDetailsFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { searchBgg, getBggGameDetails, BggGameDetailsSchema, BggGameDetails } from './bgg-tools';

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
  imageUrl: z.string().optional().describe('A URL to the game\'s box art image.'),
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
    tools: [searchBgg, getBggGameDetails]
  },
  async (input) => {
    
    // Step 1: Use AI to get the title from the image.
    const llmResponse = await getGameTitlePrompt(input);
    const title = llmResponse.output?.title;

    if (!title) {
        throw new Error("Could not determine game title from the image.");
    }
    
    let gameDetails: BggGameDetails | null = null;
    
    // Step 2: Use the title to search BGG for potential matches.
    const searchResults = await searchBgg({ query: title });
    
    if (searchResults && searchResults.length > 0) {
        // Step 3: Fetch lightweight stats for the top few results to find the best match.
        const detailedStatsPromises = searchResults.slice(0, 3).map(result => getBggGameDetails({ id: result.id }));
        const detailedStats = await Promise.all(detailedStatsPromises);

        // Filter out any null results and sort by rating count to find the most popular (likely correct) version.
        const sortedResults = detailedStats
          .filter((details): details is BggGameDetails => details !== null && details.id > 0)
          .sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));

        if (sortedResults.length > 0) {
            // Step 4: We have the best game, which is the first in the sorted list.
            gameDetails = sortedResults[0];
        }
    }
    
    // If BGG lookup failed or returned no results, we throw an error.
    if (!gameDetails) {
        throw new Error(`Could not find detailed game info for "${title}" on BoardGameGeek.`);
    }

    // Map BGG complexity to our difficulty enum
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Intermediate';
    if (gameDetails.complexity) {
        if (gameDetails.complexity < 2.0) {
            difficulty = 'Beginner';
        } else if (gameDetails.complexity < 3.0) {
            difficulty = 'Intermediate';
        } else if (gameDetails.complexity < 4.0) {
            difficulty = 'Advanced';
        } else {
            difficulty = 'Expert';
        }
    }
    
    // Step 5: Ensure the image URL has a protocol.
    let finalImageUrl = gameDetails.imageUrl || '';
    if (finalImageUrl && finalImageUrl.startsWith('//')) {
      finalImageUrl = `https:${finalImageUrl}`;
    }
    
    return {
        name: gameDetails.name,
        category: gameDetails.category || 'Unknown',
        mechanics: gameDetails.mechanics || [],
        minPlayers: gameDetails.minPlayers || 1,
        maxPlayers: gameDetails.maxPlayers || 2,
        difficulty,
        yearPublished: gameDetails.yearPublished,
        description: gameDetails.description,
        minPlaytime: gameDetails.minPlaytime,
        maxPlaytime: gameDetails.maxPlaytime,
        rating: gameDetails.rating,
        ratingCount: gameDetails.ratingCount,
        complexity: gameDetails.complexity,
        designers: gameDetails.designers,
        publishers: gameDetails.publishers,
        imageUrl: finalImageUrl,
    };
  }
);
