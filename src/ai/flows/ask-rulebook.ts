
'use server';
/**
 * @fileOverview An AI flow to answer questions based on a game's rulebook.
 *
 * - askRulebook - A function that takes rulebook text and a user query and returns an answer.
 * - AskRulebookInput - The input type for the askRulebook function.
 * - AskRulebookOutput - The return type for the askRulebook function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AskRulebookInputSchema = z.object({
  rulebookText: z.string().describe('The full text content of the game\'s rulebook.'),
  query: z.string().describe('The user\'s question about the rules.'),
});
export type AskRulebookInput = z.infer<typeof AskRulebookInputSchema>;

const AskRulebookOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s question.'),
});
export type AskRulebookOutput = z.infer<typeof AskRulebookOutputSchema>;

export async function askRulebook(input: AskRulebookInput): Promise<AskRulebookOutput> {
  return askRulebookFlow(input);
}

const askRulebookPrompt = ai.definePrompt({
  name: 'askRulebookPrompt',
  input: { schema: AskRulebookInputSchema },
  output: { schema: AskRulebookOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are the "Rules Wizard," an expert on board game rules. Your task is to answer a user's question based *only* on the provided rulebook text.

If the answer is not in the rulebook text, state that you cannot find the answer in the provided rules. Do not make up information.

**Rulebook Text:**
---
{{{rulebookText}}}
---

**User's Question:**
"{{{query}}}"

Provide a clear and concise answer based on the rulebook.`,
});

const askRulebookFlow = ai.defineFlow(
  {
    name: 'askRulebookFlow',
    inputSchema: AskRulebookInputSchema,
    outputSchema: AskRulebookOutputSchema,
  },
  async (input) => {
    // If the rulebook text is empty, return a helpful message immediately.
    if (!input.rulebookText.trim()) {
      return { answer: "I'm sorry, but no rulebook has been uploaded for this game yet. Please upload a rulebook to ask questions." };
    }

    const { output } = await askRulebookPrompt(input);
    
    if (!output?.answer) {
      throw new Error('The Rules Wizard was unable to generate an answer.');
    }
    
    return output;
  }
);
