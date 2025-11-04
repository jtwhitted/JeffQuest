'use server';
/**
 * @fileOverview An AI flow to extract a board game title from an image.
 *
 * - getGameTitleFromImage - A function that takes an image of a game box and returns the title.
 * - GetGameTitleInput - The input type for the getGameTitleFromImage function.
 * - GetGameTitleOutput - The return type for the getGameTitleFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetGameTitleInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a board game box, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GetGameTitleInput = z.infer<typeof GetGameTitleInputSchema>;

const GetGameTitleOutputSchema = z.object({
  title: z.string().describe('The title of the board game identified in the image.'),
});
export type GetGameTitleOutput = z.infer<typeof GetGameTitleOutputSchema>;

export async function getGameTitleFromImage(input: GetGameTitleInput): Promise<GetGameTitleOutput> {
  return getGameTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getGameTitlePrompt',
  input: {schema: GetGameTitleInputSchema},
  output: {schema: GetGameTitleOutputSchema},
  prompt: `You are an expert at identifying board games from images of their boxes.
Analyze the provided image and extract the main title of the board game.
Return only the title of the game.

Image: {{media url=photoDataUri}}`,
});

const getGameTitleFlow = ai.defineFlow(
  {
    name: 'getGameTitleFlow',
    inputSchema: GetGameTitleInputSchema,
    outputSchema: GetGameTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
