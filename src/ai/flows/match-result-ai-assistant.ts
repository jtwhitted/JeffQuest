'use server';
/**
 * @fileOverview AI assistant to create a compelling text summary of the session report.
 *
 * - generateSessionSummary - A function that generates the session summary.
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
  gameName: z.string().describe('The name of the game played.'),
  gameDetails: GameDetailsSchema,
  datePlayed: z.string().describe('The date the game was played (ISO format).'),
  players: z.array(z.string()).describe('List of players who participated in the game.'),
  winningPlayer: z.string().optional().describe('The player who won the game (if not a cooperative game).'),
  cooperativeResult: z.enum(['win', 'loss']).optional().describe("The outcome if it was a cooperative game (e.g., 'win' or 'loss')."),
  interestingEvents: z.string().describe('A detailed description of interesting or notable events during the game session.'),
});
export type SessionSummaryInput = z.infer<typeof SessionSummaryInputSchema>;

const SessionSummaryOutputSchema = z.object({
  summary: z.string().describe('A compelling text summary of the game session, highlighting key moments and outcomes.'),
});
export type SessionSummaryOutput = z.infer<typeof SessionSummaryOutputSchema>;

export async function generateSessionSummary(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
  return generateSessionSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sessionSummaryPrompt',
  input: {schema: SessionSummaryInputSchema},
  output: {schema: SessionSummaryOutputSchema},
  prompt: `You are a seasoned tabletop gamer, skilled at creating engaging session reports.
  Create a captivating summary of the game session provided, designed to excite and inform friends who were unable to attend.
  Incorporate details about the game itself (like its category and complexity) to give more context.
  Include highlights of key moments, player achievements, and any unexpected twists.
  
  If it was a cooperative game, describe the team's success or failure. If it was competitive, focus on the winner.

  Game Name: {{{gameName}}}
  Game Details:
  - Category: {{{gameDetails.category}}}
  - Player Count: {{{gameDetails.minPlayers}}} - {{{gameDetails.maxPlayers}}}
  - Difficulty: {{{gameDetails.difficulty}}}

  Session Details:
  - Date Played: {{{datePlayed}}}
  - Players: {{#each players}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if winningPlayer}}
  - Winning Player: {{{winningPlayer}}}
  {{/if}}
  {{#if cooperativeResult}}
  - Cooperative Result: {{#if (eq cooperativeResult 'win')}}The team won!{{else}}The team lost.{{/if}}
  {{/if}}
  - Interesting Events: {{{interestingEvents}}}

  Generate a detailed, narrative-style match report based on the provided information. Make it exciting!`,
});

const generateSessionSummaryFlow = ai.defineFlow(
  {
    name: 'generateSessionSummaryFlow',
    inputSchema: SessionSummaryInputSchema,
    outputSchema: SessionSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
