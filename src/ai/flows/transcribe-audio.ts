
'use server';
/**
 * @fileOverview An AI flow to transcribe audio to text.
 *
 * - transcribeAudio - A function that takes an audio data URI and returns the transcribed text.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A recording of spoken audio, as a data URI that must include a MIME type (e.g., 'audio/webm') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  text: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<
  typeof TranscribeAudioOutputSchema
>;

export async function transcribeAudio(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    try {
      const { text } = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: [
          { media: { url: input.audioDataUri, contentType: 'audio/webm' } },
          { text: 'Transcribe this audio.' },
        ],
      });

      if (text) {
        return { text };
      } else {
        throw new Error('Transcription failed. AI returned no text output.');
      }
    } catch (e: any) {
      console.error('An error occurred during transcription:', e);
      throw new Error(`Transcription flow failed: ${e.message}`);
    }
  }
);
