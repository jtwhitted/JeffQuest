'use server';

/**
 * @fileOverview AI-powered session summaries for board game sessions.
 *
 * - generateSessionSummary - A function that generates a summary of a game session.
 * - SessionSummaryInput - The input type for the generateSessionSummary function.
 * - SessionSummaryOutput - The return type for the generateSessionSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GameDetailsSchema = z.object({
  category: z.string().describe('The category or genre of the game.'),
  minPlayers: z.number().describe('The minimum number of players.'),
  maxPlayers: z.number().describe('The maximum number of players.'),
  difficulty: z.string().optional().describe('The difficulty of the game (e.g., Beginner, Intermediate).'),
}).describe('Details about the board game that was played.');

const SessionSummaryInputSchema = z.object({
  gameName: z.string().describe('The name of the board game played.'),
  gameDetails: GameDetailsSchema,
  datePlayed: z.string().describe('The date the game was played (YYYY-MM-DD).'),
  players: z.array(z.string()).describe('The names of the players in the session.'),
  winner: z.string().optional().describe('The name of the winning player.'),
  cooperativeResult: z.enum(['win', 'loss']).optional().describe("The outcome if it was a cooperative game (e.g., 'win' or 'loss')."),
  scores: z.any().optional().describe('Game-specific statistics and details. Can include scores.'),
  interestingEvents: z.string().optional().describe('Interesting or unusual events that happened during the game session.'),
  summaryType: z.enum(['quick', 'detailed']).describe("The type of summary to generate: 'quick' for a brief overview, 'detailed' for a narrative report."),
});

export type SessionSummaryInput = z.infer<typeof SessionSummaryInputSchema>;

const SessionSummaryOutputSchema = z.object({
  summary: z.string().describe('A detailed summary of the game session, highlighting key moments and player performances.'),
});

export type SessionSummaryOutput = z.infer<typeof SessionSummaryOutputSchema>;

export async function generateSessionSummary(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
  return sessionSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sessionSummaryPrompt',
  input: {schema: SessionSummaryInputSchema.extend({ scores: z.string() })},
  output: {schema: SessionSummaryOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are a seasoned tabletop gamer, skilled at creating engaging session reports.
  Your task is to generate a {{summaryType}} summary of the game session provided.

  {{#if (eq summaryType 'quick')}}
  Generate a brief, exciting summary, 2-3 sentences long, perfect for a quick update.
  {{else}}
  Generate a captivating and detailed narrative-style match report, designed to excite and inform friends who were unable to attend. Incorporate details about the game itself (like its category and complexity) to give more context. Include highlights of key moments, player achievements, and any unexpected twists.
  {{/if}}
  
  If it was a cooperative game, describe the team's success or failure. If it was competitive, focus on the winner.

  Game Name: {{{gameName}}}
  Game Details:
  - Category: {{{gameDetails.category}}}
  - Player Count: {{{gameDetails.minPlayers}}} - {{{gameDetails.maxPlayers}}}
  - Difficulty: {{{gameDetails.difficulty}}}

  Session Details:
  - Date Played: {{{datePlayed}}}
  - Players: {{#each players}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if winner}}
  - Winning Player: {{{winner}}}
  {{/if}}
  {{#if cooperativeResult}}
  - Cooperative Result: {{#if (eq cooperativeResult 'win')}}The team won!{{else}}The team lost.{{/if}}
  {{/if}}
  - Scores: {{{scores}}}
  - Interesting Events: {{{interestingEvents}}}

  Generate the summary now.`,
});

const sessionSummaryFlow = ai.defineFlow(
  {
    name: 'sessionSummaryFlow',
    inputSchema: SessionSummaryInputSchema,
    outputSchema: SessionSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt({
        ...input,
        scores: JSON.stringify(input.scores, null, 2),
    });
    return output!;
  }
);
