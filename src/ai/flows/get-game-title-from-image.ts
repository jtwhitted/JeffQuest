
'use server';
/**
 * @fileOverview An AI flow to extract a board game title from an image.
 *
 * - getGameTitleFromImage - A function that takes an image of a game box and returns its title.
 * - GetGameTitleInput - The input type for the getGameTitleFromImage function.
 * - GetGameTitleOutput - The return type for the getGameTitleFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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

const getGameTitlePrompt = ai.definePrompt({
    name: 'getGameTitlePrompt',
    input: { schema: GetGameTitleInputSchema },
    output: { schema: GetGameTitleOutputSchema },
    model: 'googleai/gemini-2.5-flash',
    prompt: `Analyze the provided image of a board game box and identify the main title of the game. Return only the title.
  
  Image: {{media url=photoDataUri}}`,
});

const getGameTitleFlow = ai.defineFlow(
  {
    name: 'getGameTitleFlow',
    inputSchema: GetGameTitleInputSchema,
    outputSchema: GetGameTitleOutputSchema,
  },
  async (input) => {
    // This flow now only gets the title from the image.
    // All BGG data fetching will be handled in the server action.
    const { output } = await getGameTitlePrompt(input);
    if (!output) {
        throw new Error("Could not determine game title from the image.");
    }
    return output;
  }
);
