
'use server';
/**
 * @fileOverview An AI flow to generate custom data visualizations for the dashboard.
 *
 * - generateDashboardInsight - A function that takes a user query and the dataset to generate an insight.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateInsightInputSchema = z.object({
  query: z.string().describe("The user's natural language question about their game data."),
  games: z.array(z.any()).describe("An array of all games in the user's collection."),
  players: z.array(z.any()).describe("An array of all players."),
  sessions: z.array(z.any()).describe("An array of all logged game sessions."),
});
export type GenerateInsightInput = z.infer<typeof GenerateInsightInputSchema>;

const ChartDataItemSchema = z.object({
    name: z.string().describe("The label for this data point (e.g., a player's name, a game category)."),
    value: z.number().describe("The numerical value for this data point (e.g., number of wins, count of plays)."),
});

const ListItemSchema = z.object({
    name: z.string().describe("The main name or title of the list item (e.g., game name)."),
    value: z.union([z.string(), z.number()]).optional().describe("The primary value associated with the item (e.g., BGG Rating, number of plays)."),
    detail: z.string().optional().describe("An optional secondary piece of information (e.g., game category, player name)."),
});

const GenerateInsightOutputSchema = z.object({
    type: z.enum(['text', 'barChart', 'pieChart', 'list']).describe("The type of insight to display. Use 'text' for simple answers. Use 'barChart' or 'pieChart' for visualizations. Use 'list' for ranked or simple lists."),
    title: z.string().optional().describe("A concise title for the generated insight, chart, or list."),
    text: z.string().optional().describe("The text of the answer, if the type is 'text'."),
    data: z.array(z.union([ChartDataItemSchema, ListItemSchema])).optional().describe("An array of data points for the chart or list."),
});
export type GenerateInsightOutput = z.infer<typeof GenerateInsightOutputSchema>;


export async function generateDashboardInsight(input: GenerateInsightInput): Promise<GenerateInsightOutput> {
  return generateInsightFlow(input);
}


const generateInsightPrompt = ai.definePrompt({
    name: 'generateInsightPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInsightInputSchema },
    output: { schema: GenerateInsightOutputSchema },
    prompt: `You are a data analyst for a board game tracking app. Your task is to answer a user's question based *only* on the provided JSON data.

Analyze the user's query and the provided 'games', 'players', and 'sessions' data to formulate an answer.

**CRITICAL INSTRUCTIONS:**
1.  **FILTER FIRST:** Before any other operation, filter the data according to the user's request. For example, if they ask for "cooperative games", you MUST filter the 'games' array to only include games where the 'mechanics' array contains 'Cooperative Game'. If they ask about a specific player, filter the 'sessions' for that player.
2.  **SORT SECOND:** After filtering, sort the data as requested. For example, "sorted by rating" means ordering by the 'rating' field. "Most played" means counting sessions and sorting by that count.
3.  **CHOOSE OUTPUT TYPE:** Based on the query, decide on the best output format.
    -   Use 'barChart' or 'pieChart' for visual breakdowns (e.g., "chart...", "show me a breakdown...").
    -   Use 'list' for rankings or lists (e.g., "top 5...", "list all...").
    -   Use 'text' for simple, single-value answers (e.g., "how many sessions?", "what is my most played game?").
4.  **FORMAT DATA:** Structure the data property to match the chosen output type.
    -   For charts ('barChart', 'pieChart'), the items in 'data' should have a 'name' (the label) and a 'value' (the number).
    -   For lists, 'name' is the main item, 'value' is the metric it's sorted by (like a rating), and 'detail' can be extra info.
5.  **TITLE:** The 'title' field is optional, but if provided, it should be descriptive of the query.

User Query: "{{{query}}}"

The user has provided the following data:
- Games: {{{json games}}}
- Players: {{{json players}}}
- Sessions: {{{json sessions}}}
`,
});

const generateInsightFlow = ai.defineFlow(
  {
    name: 'generateInsightFlow',
    inputSchema: GenerateInsightInputSchema,
    outputSchema: GenerateInsightOutputSchema,
  },
  async (input) => {

    if (input.sessions.length === 0) {
        return {
            type: 'text',
            title: 'No Data Yet',
            text: "You haven't logged any sessions yet. Play some games and log them to start generating insights!",
        };
    }

    const { output } = await generateInsightPrompt(input);
    
    if (!output) {
      throw new Error('The AI was unable to generate an insight for this query.');
    }
    
    return output;
  }
);
