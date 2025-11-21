
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
    name: z.string().describe("The label for this data point (e.g., a player's name, a game category, a month)."),
    value: z.number().describe("The numerical value for this data point (e.g., number of wins, count of plays)."),
});

const StackedChartDataItemSchema = z.object({
    name: z.string().describe("The label for the category (e.g., a player's name)."),
}).passthrough(); // Allows any other properties, which will be the stacked bar keys (e.g., { name: 'Player A', wins: 5, losses: 3 })


const ListItemSchema = z.object({
    id: z.string().optional().describe("The unique ID of the main item, if applicable (e.g., the game ID)."),
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

First, analyze the user's query and the provided 'games', 'players', and 'sessions' data. Filter and aggregate the data as requested. Then, determine the best format for the answer.

**CRITICAL INSTRUCTIONS:**
1.  **CHOOSE OUTPUT TYPE:** Based on the query, decide on the best output format from this list: 'text', 'barChart', 'pieChart', 'lineChart', 'horizontalBarChart', 'stackedBarChart', 'list'.
    -   Use 'barChart', 'pieChart', 'lineChart', 'horizontalBarChart', or 'stackedBarChart' for visual breakdowns (e.g., "chart...", "show me a breakdown...").
    -   Use 'lineChart' for time-series data (e.g., "plays per month").
    -   Use 'horizontalBarChart' when comparing many items or items with long labels.
    -   Use 'stackedBarChart' for part-to-whole comparisons across categories (e.g., "wins and losses per player").
    -   Use 'list' for rankings or simple lists (e.g., "top 5...", "list all...").
    -   Use 'text' for simple, single-value answers (e.g., "how many sessions?", "what is my most played game?").
2.  **FORMAT DATA:** Structure the 'data' property to match the chosen output type.
    -   For 'barChart', 'pieChart', 'lineChart', and 'horizontalBarChart', items in 'data' must be objects with 'name' (string) and 'value' (number) properties.
    -   For 'stackedBarChart', items must have a 'name' (string) and then additional keys for each stack value (e.g., 'wins', 'losses'). You MUST also provide the 'dataKeys' array with the names of the stack value keys.
    -   For 'list', items can have 'id', 'name', 'value', 'detail', and 'imageUrl'. When creating a list of games, you MUST include the 'id' and 'imageUrl' for each game in the data response.
3.  **TITLE:** The 'title' field is optional, but if provided, it should be a concise and descriptive title for the generated insight.

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
