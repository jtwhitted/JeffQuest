'use server';
/**
 * @fileOverview An AI flow to generate custom data visualizations for the dashboard.
 *
 * - generateDashboardInsight - A function that takes a user query and returns a proposed structure.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';


const GenerateInsightInputSchema = z.object({
  query: z.string().describe("The user's natural language question about their game data."),
});
export type GenerateInsightInput = z.infer<typeof GenerateInsightInputSchema>;

const GenerateInsightOutputSchema = z.object({
    type: z.enum(['text', 'barChart', 'pieChart', 'lineChart', 'horizontalBarChart', 'stackedBarChart', 'list']).describe("The type of insight to display."),
    title: z.string().optional().describe("A concise, descriptive title for the generated insight, chart, or list."),
    dataKeys: z.array(z.string()).optional().describe("For stackedBarChart, an array of the keys used for the stacks (e.g., ['wins', 'losses'])."),
});
export type GenerateInsightOutput = z.infer<typeof GenerateInsightOutputSchema>;


export async function generateDashboardInsight(input: GenerateInsightInput): Promise<GenerateInsightOutput> {
  return generateInsightFlow(input);
}


const generateInsightPrompt = ai.definePrompt({
    name: 'generateInsightPrompt',
    model: 'googleai/gemini-3-flash-preview',
    input: { schema: GenerateInsightInputSchema },
    output: { schema: GenerateInsightOutputSchema },
    prompt: `You are a data analysis tool for a board game tracking app. Your **only** task is to analyze the user's query and decide what kind of data visualization is most appropriate. You **MUST NOT** generate any explanatory text, conversation, or anything other than the structured JSON output.

**CRITICAL INSTRUCTIONS:**
1.  **ANALYZE THE QUERY:** Analyze the user's query: "{{query}}".
2.  **CHOOSE OUTPUT TYPE:** Based on the query, decide on the single best output format from this list: 'text', 'barChart', 'pieChart', 'lineChart', 'horizontalBarChart', 'stackedBarChart', 'list'.
    -   Use charts for visual breakdowns (e.g., "chart...", "show me a breakdown...").
    -   Use 'lineChart' for time-series data (e.g., "plays per month").
    -   Use 'horizontalBarChart' for comparing many items or items with long labels (e.g., 'most played games').
    -   Use 'stackedBarChart' for part-to-whole comparisons across categories (e.g., "wins and losses per player").
    -   Use 'list' for ranked lists or simple lists (e.g., "top 5...", "list all..."). **ALWAYS prefer 'list' over 'text' if the answer involves one or more games or players.**
    -   Use 'text' only for simple, single-value answers that do not refer to a specific game or player (e.g., "how many total sessions?", "what is my overall win rate?").
3.  **DEFINE STRUCTURE FOR CHART KEYS:** For stackedBarChart, define the 'dataKeys' property (e.g., ['wins', 'losses']). For all other chart types, this is not needed.
4.  **TITLE:** Provide a concise and descriptive title for the generated insight that accurately reflects the user's query.

You only need to define the output structure. The application code will handle the data processing. Return only the structured JSON output.
`,
});

const generateInsightFlow = ai.defineFlow(
  {
    name: 'generateInsightFlow',
    inputSchema: GenerateInsightInputSchema,
    outputSchema: GenerateInsightOutputSchema,
  },
  async (input) => {
    
    const { output } = await generateInsightPrompt(input);
    
    if (!output) {
      throw new Error('The AI was unable to generate an insight for this query.');
    }
    
    // The AI flow is only responsible for returning the structure.
    // The client-side application will handle all data processing.
    return output;
  }
);
