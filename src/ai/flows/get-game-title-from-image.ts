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

const getDetailsFromTitlePrompt = ai.definePrompt({
    name: 'getDetailsFromTitlePrompt',
    input: { schema: z.object({ name: z.string() }) },
    output: { schema: GetGameDetailsOutputSchema.omit({ name: true, imageUrl: true }) },
    prompt: `You are a board game expert. Based on the game title "{{name}}", provide a best-guess approximation for the following details.
    
    - category: A single, primary category.
    - mechanics: A list of 2-3 core mechanics.
    - minPlayers: A reasonable minimum number of players.
    - maxPlayers: A reasonable maximum number of players.
    - difficulty: Your best estimate of the difficulty.
    - description: A short, one-paragraph description of the game.
    
    Do not invent wild details. Base your answer on general knowledge of popular board games.
    If you do not know the game, provide very generic details (e.g., "Strategy", 2-4 players, "Intermediate").`
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
    
    // Step 2: Use another AI prompt to generate default data from the title.
    const { output } = await getDetailsFromTitlePrompt({ name: title });
    if (!output) {
        throw new Error('AI fallback for details failed.');
    }

    // This flow no longer fetches an image URL.
    // The image URL will be retrieved via the BGG API when a game is added.

    return {
        name: title,
        category: output.category,
        mechanics: output.mechanics,
        minPlayers: output.minPlayers,
        maxPlayers: output.maxPlayers,
        difficulty: output.difficulty,
        yearPublished: output.yearPublished,
        description: output.description,
        minPlaytime: output.minPlaytime,
        maxPlaytime: output.maxPlaytime,
        rating: output.rating,
        ratingCount: output.ratingCount,
        complexity: output.complexity,
        designers: output.designers,
        publishers: output.publishers,
        imageUrl: '', // This will be populated later
    };
  }
);
