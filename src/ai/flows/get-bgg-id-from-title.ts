
'use server';
/**
 * @fileOverview An AI flow to get the BoardGameGeek ID for a game title.
 *
 * - getBggIdFromTitle - A function that takes a game title and returns its BGG ID.
 * - GetBggIdInput - The input type for the getBggIdFromTitle function.
 * - GetBggIdOutput - The return type for the getBggIdFromTitle function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetBggIdInputSchema = z.object({
  title: z.string().describe('The title of the board game.'),
});
export type GetBggIdInput = z.infer<typeof GetBggIdInputSchema>;

const GetBggIdOutputSchema = z.object({
  bggId: z.string().describe('The BoardGameGeek ID for the game. Should be a string of numbers.'),
});
export type GetBggIdOutput = z.infer<typeof GetBggIdOutputSchema>;

export async function getBggIdFromTitle(input: GetBggIdInput): Promise<GetBggIdOutput> {
  return getBggIdFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getBggIdPrompt',
  input: { schema: GetBggIdInputSchema },
  output: { schema: GetBggIdOutputSchema },
  prompt: `You are an expert on the board game website BoardGameGeek (BGG).
Your task is to find the official BGG ID for the board game titled "{{title}}".

Return only the ID number. For example, for "Catan", you would return "13".
`,
});

const getBggIdFlow = ai.defineFlow(
  {
    name: 'getBggIdFlow',
    inputSchema: GetBggIdInputSchema,
    outputSchema: GetBggIdOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output?.bggId) {
        throw new Error("Could not determine BGG ID from the title.");
    }
    return output;
  }
);
