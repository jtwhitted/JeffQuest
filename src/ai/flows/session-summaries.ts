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
  gameStats: z.record(z.any()).describe('Game-specific statistics and details. Can include winner, scores, or cooperative result.'),
  interestingEvents: z.string().optional().describe('Interesting or unusual events that happened during the game session.'),
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
  input: {schema: SessionSummaryInputSchema.extend({ gameStats: z.string() })},
  output: {schema: SessionSummaryOutputSchema},
  prompt: `You are a board game enthusiast who summarizes game sessions.

  Given the following information about a board game session, generate a detailed summary, highlighting key moments, notable performances, and any interesting events. Use details about the game itself to add context.
  If the game was cooperative, reflect that in the summary.

  Game Name: {{{gameName}}}
  Game Details:
  - Category: {{{gameDetails.category}}}
  - Player Count: {{{gameDetails.minPlayers}}} - {{{gameDetails.maxPlayers}}}
  - Difficulty: {{{gameDetails.difficulty}}}

  Session Details:
  - Date Played: {{{datePlayed}}}
  - Players: {{#each players}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - Game Stats: {{{gameStats}}}
  - Interesting Events: {{{interestingEvents}}}

  Summary:`,
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
        gameStats: JSON.stringify(input.gameStats, null, 2),
    });
    return output!;
  }
);
