
'use server';
/**
 * @fileOverview An AI flow to get a board game's BGG ID from its title.
 *
 * - getBggIdFromTitle - A function that takes a game title and returns its BGG ID.
 * - GetBggIdFromTitleInput - The input type for the getBggIdFromTitle function.
 * - GetBggIdFromTitleOutput - The return type for the getBggIdFromTitle function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetBggIdFromTitleInputSchema = z.object({
  title: z.string().describe('The title of the board game.'),
});
export type GetBggIdFromTitleInput = z.infer<typeof GetBggIdFromTitleInputSchema>;

const GetBggIdFromTitleOutputSchema = z.object({
  bggId: z.string().describe('The BoardGameGeek ID for the game. Should be a string of numbers.'),
});
export type GetBggIdFromTitleOutput = z.infer<typeof GetBggIdFromTitleOutputSchema>;

export async function getBggIdFromTitle(input: GetBggIdFromTitleInput): Promise<GetBggIdFromTitleOutput> {
  return getBggIdFlow(input);
}

const getBggIdPrompt = ai.definePrompt({
  name: 'getBggIdPrompt',
  input: { schema: GetBggIdFromTitleInputSchema },
  output: { schema: GetBggIdFromTitleOutputSchema },
  prompt: `You are a BoardGameGeek expert. Your task is to find the official BoardGameGeek ID for a given board game title.
  
  Game Title: {{{title}}}
  
  Return only the numeric ID for the base game, not for expansions or different versions.
  For example, for "Catan", the ID is "13". For "Wingspan", the ID is "266192".`,
});

const getBggIdFlow = ai.defineFlow(
  {
    name: 'getBggIdFlow',
    inputSchema: GetBggIdFromTitleInputSchema,
    outputSchema: GetBggIdFromTitleOutputSchema,
  },
  async (input) => {
    const { output } = await getBggIdPrompt(input);
    if (!output) {
      throw new Error('Could not determine BGG ID from the title.');
    }
    return output;
  }
);
