'use server';
/**
 * @fileOverview An AI flow to visually select the correct board game from a list of candidates.
 *
 * - selectGameFromImages - A function that takes a user's photo and a list of BGG game images to find the best match.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Part } from 'genkit';

const CandidateGameSchema = z.object({
  bggId: z.string().describe("The BoardGameGeek ID of the candidate game."),
  name: z.string().describe("The name of the candidate game."),
  imageUrl: z.string().describe("The URL of the official box art for this game."),
});

const SelectGameInputSchema = z.object({
  originalPhotoDataUri: z
    .string()
    .describe(
      "The user's original photo of a board game box, as a data URI."
    ),
  candidates: z.array(CandidateGameSchema).describe("An array of potential matching games from BGG."),
});
type SelectGameInput = z.infer<typeof SelectGameInputSchema>;

const SelectGameOutputSchema = z.object({
  bestMatchBggId: z.string().describe("The BGG ID of the candidate that is the best visual match to the user's photo."),
});
type SelectGameOutput = z.infer<typeof SelectGameOutputSchema>;


export async function selectGameFromImages(input: SelectGameInput): Promise<SelectGameOutput> {
  return selectGameFlow(input);
}

const selectGameFlow = ai.defineFlow(
  {
    name: 'selectGameFlow',
    inputSchema: SelectGameInputSchema,
    outputSchema: SelectGameOutputSchema,
  },
  async (input) => {
    // Construct the dynamic prompt with multiple media parts
    const promptParts: Part[] = [
      {
        text: `You are a visual comparison expert. Your task is to identify which official board game box art is the correct match for a photo taken by a user.

I will provide you with the user's photo first. Then, I will provide a list of candidate games with their official box art.

Please analyze all the images and determine which candidate is the best match. Return the 'bggId' of the single best match.

Here is the user's photo:`,
      },
      { media: { url: input.originalPhotoDataUri } },
      { text: "\n\nHere is the list of candidate games. For each one, I will provide the name, bggId, and the official box art image:" }
    ];

    input.candidates.forEach(candidate => {
      promptParts.push({ text: `\n\nCandidate Name: ${candidate.name}\nCandidate BGG ID: ${candidate.bggId}` });
      promptParts.push({ media: { url: candidate.imageUrl } });
    });

    promptParts.push({ text: "\n\nNow, based on your visual analysis, which candidate is the correct one? Return only the bggId of the best match." });

    const { output } = await ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      prompt: promptParts,
      output: { schema: SelectGameOutputSchema },
      config: { temperature: 0.1 }
    });

    if (!output?.bestMatchBggId) {
      throw new Error("The AI could not determine the best match from the provided images.");
    }
    
    return output;
  }
);
