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
import { getRulebookCacheName, askWithCachedRulebook } from '@/ai/rulebook-cache';

const DocumentSchema = z.object({
  name: z.string().describe("The user-provided name of the document (e.g., 'Core Rulebook', 'FAQ')."),
  type: z.enum(['Rulebook', 'Errata', 'Quick Start', 'House Rules', 'Other']).describe("The type of document."),
  text: z.string().describe("The full text content of the document."),
});

const AskRulebookInputSchema = z.object({
  documents: z.array(DocumentSchema).describe('An array of all rulebook documents for the game.'),
  query: z.string().describe('The user\'s question about the rules.'),
});
export type AskRulebookInput = z.infer<typeof AskRulebookInputSchema>;

const CitationSchema = z.object({
    documentName: z.string().describe("The exact name of the source document from which the information was taken."),
    pageNumber: z.coerce.number().optional().describe("The page number in the source document where the answer can be found."),
});

const AskRulebookOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s question.'),
  citations: z.array(CitationSchema).optional().describe("An array of sources used to generate the answer. Each source must include the document name and, if possible, the page number."),
});
export type AskRulebookOutput = z.infer<typeof AskRulebookOutputSchema>;

export async function askRulebook(input: AskRulebookInput): Promise<AskRulebookOutput> {
  return askRulebookFlow(input);
}

const askRulebookPrompt = ai.definePrompt({
  name: 'askRulebookPrompt',
  input: { schema: AskRulebookInputSchema },
  output: { schema: AskRulebookOutputSchema },
  model: 'googleai/gemini-3-flash-preview',
  prompt: `You are the "Rules Wizard," an expert on board game rules. Your task is to answer a user's question based *only* on the provided rulebook documents.

**CRITICAL INSTRUCTIONS:**
1.  **Prioritize Documents:** Use the documents in this order of priority: 1) Errata, 2) Rulebook, 3) Quick Start, 4) House Rules, 5) Other. If an Errata document contradicts a Rulebook, the Errata is correct.
2.  **Formulate the Answer:** Provide a clear and concise answer based *only* on the content of the rulebook documents, respecting the priority order.
3.  **Provide Citations:** After giving the answer, you MUST provide citations for where you found the information.
    - The citation must include the 'documentName' which is the user-provided name of the source document.
    - If the source document has page numbers in its text, extract the page number. If not, you can omit the 'pageNumber' field.

If the answer is not in the provided documents, state that you cannot find the answer in the provided rules. Do not make up information.

**Rulebook Documents:**
---
{{#each documents}}
## Document Name: {{{name}}}
## Document Type: {{{type}}}

{{{text}}}

---
{{/each}}

**User's Question:**
"{{{query}}}"`,
});

const askRulebookFlow = ai.defineFlow(
  {
    name: 'askRulebookFlow',
    inputSchema: AskRulebookInputSchema,
    outputSchema: AskRulebookOutputSchema,
  },
  async (input) => {
    // If there are no documents, return a helpful message.
    if (!input.documents || input.documents.length === 0) {
      return { answer: "I'm sorry, but no rulebooks have been uploaded for this game yet. Please upload a rulebook to ask questions." };
    }

    // Try answering from a Gemini context cache of these documents first, so
    // repeated questions about the same game don't re-send the full
    // rulebook text every time. Falls through to the normal (uncached) path
    // below on any failure — caching is a cost optimization, never a
    // functionality requirement.
    const cacheName = await getRulebookCacheName(input.documents);
    if (cacheName) {
      const cachedResult = await askWithCachedRulebook(cacheName, input.query);
      if (cachedResult?.answer) {
        return cachedResult;
      }
    }

    const { output } = await askRulebookPrompt(input);

    if (!output?.answer) {
      throw new Error('The Rules Wizard was unable to generate an answer.');
    }

    return output;
  }
);
