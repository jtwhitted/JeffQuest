
'use server';
/**
 * @fileOverview An AI flow to generate custom data visualizations for the dashboard.
 *
 * - generateDashboardInsight - A function that takes a user query and the dataset to generate an insight.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AiInsightGame, AiInsightPlayer, AiInsightSession } from '@/lib/types';


const GenerateInsightInputSchema = z.object({
  query: z.string().describe("The user's natural language question about their game data."),
  games: z.array(z.custom<AiInsightGame>()).describe("A slimmed-down array of all games in the user's collection."),
  players: z.array(z.custom<AiInsightPlayer>()).describe("A slimmed-down array of all players."),
  sessions: z.array(z.custom<AiInsightSession>()).describe("A slimmed-down array of all logged game sessions."),
});
export type GenerateInsightInput = z.infer<typeof GenerateInsightInputSchema>;

const ChartDataItemSchema = z.object({
    name: z.string().describe("The label for this data point (e.g., a player's name, a game category, a month)."),
    value: z.number().describe("The numerical value for this data point (e.g., number of wins, count of plays)."),
});

const StackedChartDataItemSchema = z.object({ name: z.string() }).catchall(z.union([z.string(), z.number()]));


const ListItemSchema = z.object({
    id: z.string().describe("The unique ID of the main item (e.g., the game ID or player ID)."),
    name: z.string().describe("The main name or title of the list item (e.g., game name)."),
    value: z.union([z.string(), z.number()]).optional().describe("The primary value associated with the item (e.g., BGG Rating, number of plays)."),
    detail: z.string().optional().describe("An optional secondary piece of information (e.g., game category, player name)."),
    imageUrl: z.string().optional().describe("A URL for an image of the item, if available."),
});

const GenerateInsightOutputSchema = z.object({
    type: z.enum(['text', 'barChart', 'pieChart', 'lineChart', 'horizontalBarChart', 'stackedBarChart', 'list']).describe("The type of insight to display."),
    title: z.string().optional().describe("A concise, descriptive title for the generated insight, chart, or list."),
    text: z.string().optional().describe("The text of the answer, if the type is 'text'."),
    data: z.array(z.union([ChartDataItemSchema, ListItemSchema, StackedChartDataItemSchema])).optional().describe("An array of data points for the chart or list."),
    dataKeys: z.array(z.string()).optional().describe("For stackedBarChart, an array of the keys used for the stacks (e.g., ['wins', 'losses'])."),
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

**CRITICAL INSTRUCTIONS:**
1.  **PROCESS DATA:** First, analyze the user's query to understand the required filtering, sorting, and aggregation. Then, process the provided 'games', 'players', and 'sessions' data accordingly.
2.  **CHOOSE OUTPUT TYPE:** Based on the processed data and the query, decide on the single best output format from this list: 'text', 'barChart', 'pieChart', 'lineChart', 'horizontalBarChart', 'stackedBarChart', 'list'.
    -   Use charts for visual breakdowns (e.g., "chart...", "show me a breakdown...").
    -   Use 'lineChart' for time-series data (e.g., "plays per month").
    -   Use 'horizontalBarChart' for comparing many items or items with long labels.
    -   Use 'stackedBarChart' for part-to-whole comparisons across categories (e.g., "wins and losses per player").
    -   Use 'list' for ranked lists or simple lists (e.g., "top 5...", "list all..."). **ALWAYS prefer 'list' over 'text' if the answer involves one or more games or players.**
    -   Use 'text' only for simple, single-value answers that do not refer to a specific game or player (e.g., "how many total sessions?", "what is my overall win rate?").
3.  **FORMAT 'data' PROPERTY:** Structure the 'data' array to perfectly match the chosen output type.
    -   For 'barChart', 'pieChart', 'lineChart', and 'horizontalBarChart', each item in 'data' MUST be an object with 'name' (string) and 'value' (number) properties.
    -   For 'stackedBarChart', each item MUST have a 'name' (string) and then additional keys for each stack value (e.g., 'wins', 'losses'). You MUST also provide the 'dataKeys' array containing the names of those stack value keys.
    -   For 'list', each item MUST have an 'id'. When creating a list of games, you MUST include the 'imageUrl'. When creating a list of players, use their name as the 'detail'.
4.  **TITLE:** Provide a concise and descriptive title for the generated insight.

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

    if (input.sessions.length === 0 && input.games.length === 0) {
        return {
            type: 'text',
            title: 'No Data Yet',
            text: "You haven't logged any sessions or added any games yet. Get started to begin generating insights!",
        };
    }

    const { output } = await generateInsightPrompt(input);
    
    if (!output) {
      throw new Error('The AI was unable to generate an insight for this query.');
    }
    
    return output;
  }
);
