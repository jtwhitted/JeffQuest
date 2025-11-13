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
  photoDataUri: z
    .string()
    .describe('The original photo data URI that was provided as input.'),
});
export type GetGameTitleOutput = z.infer<typeof GetGameTitleOutputSchema>;

export async function getGameTitleFromImage(input: GetGameTitleInput): Promise<GetGameTitleOutput> {
  return getGameTitleFlow(input);
}

const getGameTitlePrompt = ai.definePrompt({
    name: 'getGameTitlePrompt',
    input: { schema: GetGameTitleInputSchema },
    output: { schema: z.object({ title: z.string() }) },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert at identifying board games from images of their box art.
Your task is to analyze the provided image and extract the main title of the game.

- The title is usually the most prominent text on the box.
- Ignore any taglines, edition information, or publisher logos.
- Return only the main title of the game.

Image: {{media url=photoDataUri}}`,
});

const getGameTitleFlow = ai.defineFlow(
  {
    name: 'getGameTitleFlow',
    inputSchema: GetGameTitleInputSchema,
    outputSchema: GetGameTitleOutputSchema,
  },
  async (input) => {
    const { output } = await getGameTitlePrompt(input);
    if (!output?.title) {
        throw new Error("Could not determine game title from the image.");
    }
    return {
        title: output.title,
        photoDataUri: input.photoDataUri,
    };
  }
);
