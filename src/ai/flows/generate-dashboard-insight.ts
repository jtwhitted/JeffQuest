
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

const GenerateInsightOutputSchema = z.object({
    type: z.enum(['text', 'barChart', 'pieChart']).describe("The type of insight to display. Use 'text' for simple answers. Use 'barChart' or 'pieChart' for visualizations."),
    title: z.string().optional().describe("A concise title for the generated insight or chart."),
    text: z.string().optional().describe("The text of the answer, if the type is 'text'."),
    data: z.array(ChartDataItemSchema).optional().describe("An array of data points for the chart, if the type is 'barChart' or 'pieChart'."),
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

- If the user asks for a chart or a visual breakdown (e.g., 'chart...', 'show me a breakdown...', '... by player'), generate data suitable for a 'barChart' or 'pieChart'.
- For simple factual questions (e.g., 'what is my most played game?', 'how many sessions have I logged?'), provide a 'text' response.
- Your response MUST be in the specified JSON output format.
- When generating chart data, the 'name' field should be the label (like a player's name or a game category) and the 'value' field should be the number.
- Make the title descriptive of the query.

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
