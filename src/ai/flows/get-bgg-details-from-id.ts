
'use server';
/**
 * @fileOverview An AI flow to get BoardGameGeek details for a given ID.
 *
 * - getBggDetailsFromId - A function that takes a BGG ID and returns game details.
 * - GetBggDetailsInput - The input type for the getBggDetailsFromId function.
 * - GetBggDetailsOutput - The return type for the getBggDetailsFromId function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetBggDetailsInputSchema = z.object({
  bggId: z.string().describe('The BoardGameGeek ID of the game.'),
});
export type GetBggDetailsInput = z.infer<typeof GetBggDetailsInputSchema>;

const GetBggDetailsOutputSchema = z.object({
  name: z.string().describe('The primary name of the board game.'),
  imageUrl: z.string().url().describe('A direct URL to the game\'s box art image.'),
  description: z.string().describe('A detailed description of the game.'),
  yearPublished: z.number().optional().describe('The year the game was published.'),
  minPlayers: z.number().describe('The minimum number of players.'),
  maxPlayers: z.number().describe('The maximum number of players.'),
  minPlaytime: z.number().optional().describe('The minimum playtime in minutes.'),
  maxPlaytime: z.number().optional().describe('The maximum playtime in minutes.'),
  difficulty: z.string().optional().describe('The perceived difficulty (e.g., Intermediate).'),
  category: z.string().describe('The primary category of the game.'),
  mechanics: z.array(z.string()).describe('A list of the game\'s key mechanics.'),
  designers: z.array(z.string()).describe('A list of the game\'s designers.'),
  publishers: z.array(z.string()).describe('A list of the game\'s publishers.'),
  rating: z.number().optional().describe('The average user rating on BGG (1-10).'),
  ratingCount: z.number().optional().describe('The number of ratings on BGG.'),
  complexity: z.number().optional().describe('The complexity or "weight" rating on BGG (1-5).'),
});
export type GetBggDetailsOutput = z.infer<typeof GetBggDetailsOutputSchema>;

export async function getBggDetailsFromId(input: GetBggDetailsInput): Promise<GetBggDetailsOutput> {
  return getBggDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getBggDetailsPrompt',
  input: { schema: GetBggDetailsInputSchema },
  output: { schema: GetBggDetailsOutputSchema },
  prompt: `You are a board game expert with access to the BoardGameGeek (BGG) database.
Your task is to provide detailed information for the game with the BGG ID: {{bggId}}.

Provide the following information based on the BGG database:
- name: The primary full name of the game.
- imageUrl: The original, high-quality image URL for the game box art.
- description: The full description of the game.
- yearPublished: The year of original publication.
- minPlayers: The minimum number of players.
- maxPlayers: The maximum number of players.
- minPlaytime: The minimum playtime in minutes.
- maxPlaytime: The maximum playtime in minutes.
- difficulty: A general difficulty descriptor (e.g., Beginner, Intermediate, Advanced).
- category: The most prominent game category.
- mechanics: A list of the most important game mechanics.
- designers: A list of the designers.
- publishers: A list of the primary publishers.
- rating: The average user rating, as a float.
- ratingCount: The total number of user ratings.
- complexity: The 'weight' or complexity rating of the game, as a float out of 5.

Return the complete, structured data.`,
});

const getBggDetailsFlow = ai.defineFlow(
  {
    name: 'getBggDetailsFlow',
    inputSchema: GetBggDetailsInputSchema,
    outputSchema: GetBggDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error(`Could not retrieve details for BGG ID ${input.bggId}.`);
    }
    return output;
  }
);
