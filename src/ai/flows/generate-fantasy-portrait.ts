
'use server';
/**
 * @fileOverview An AI flow to generate a fantasy portrait from a player's avatar and bio.
 *
 * - generateFantasyPortrait - A function that takes a player's avatar and bio to create an image.
 * - GenerateFantasyPortraitInput - The input type for the function.
 * - GenerateFantasyPortraitOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateFantasyPortraitInputSchema = z.object({
  avatarDataUri: z
    .string()
    .describe(
      "A photo of the player, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  bio: z.string().describe('The legendary biography of the player.'),
});
export type GenerateFantasyPortraitInput = z.infer<typeof GenerateFantasyPortraitInputSchema>;

const GenerateFantasyPortraitOutputSchema = z.object({
  fantasyPortraitDataUri: z
    .string()
    .describe(
      "The generated fantasy portrait, as a data URI."
    ),
});
export type GenerateFantasyPortraitOutput = z.infer<typeof GenerateFantasyPortraitOutputSchema>;

export async function generateFantasyPortrait(input: GenerateFantasyPortraitInput): Promise<GenerateFantasyPortraitOutput> {
  return generateFantasyPortraitFlow(input);
}

const generateFantasyPortraitFlow = ai.defineFlow(
  {
    name: 'generateFantasyPortraitFlow',
    inputSchema: GenerateFantasyPortraitInputSchema,
    outputSchema: GenerateFantasyPortraitOutputSchema,
  },
  async ({ avatarDataUri, bio }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        { media: { url: avatarDataUri } },
        { text: `Create a cinematic, epic fantasy-style painted portrait based on this person's photo and their legend. The legend is: "${bio}". The style should be dramatic and painterly.` },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed to return an image.');
    }

    return { fantasyPortraitDataUri: media.url };
  }
);
