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

const getGameDetailsFlow = ai.defineFlow(
  {
    name: 'getGameDetailsFlow',
    inputSchema: GetGameDetailsInputSchema,
    outputSchema: GetGameDetailsOutputSchema,
  },
  async (input) => {
    
    const llmResponse = await ai.generate({
        prompt: `You are an expert board game assistant. Your goal is to identify a board game from an image of its box and return detailed information about it.

1.  First, analyze the provided image to determine the title of the board game.
2.  Use the 'searchBgg' tool to find the game on BoardGameGeek. You might need to try variations of the title if the first search fails.
3.  Once you have a valid game ID from the search results, use the 'getBggGameDetails' tool to fetch the detailed information.
4.  From the detailed information, determine the game's difficulty based on its 'complexity' rating (weight):
    - Less than 2: 'Beginner'
    - 2 to 3: 'Intermediate'
    - 3 to 4: 'Advanced'
    - 4 or more: 'Expert'
5.  Finally, format and return all the required details as your final output.

Image of the game box is below.
Image: {{media url=photoDataUri}}
`,
        model: 'googleai/gemini-pro-vision',
        tools: [searchBgg, getBggGameDetails],
        output: {
            schema: GetGameDetailsOutputSchema
        }
    });

    const output = llmResponse.output();

    if (!output) {
      throw new Error("Unable to get game details from the image.");
    }
    
    // Map BGG complexity to our difficulty enum
    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' = 'Intermediate';
    if (output.complexity) {
        if (output.complexity < 2) {
            difficulty = 'Beginner';
        } else if (output.complexity < 3) {
            difficulty = 'Intermediate';
        } else if (output.complexity < 4) {
            difficulty = 'Advanced';
        } else {
            difficulty = 'Expert';
        }
    }
    
    return {
        ...output,
        difficulty
    };
  }
);
