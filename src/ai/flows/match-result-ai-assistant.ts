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

const SessionSummaryInputSchema = z.object({
  gameName: z.string().describe('The name of the game played.'),
  datePlayed: z.string().describe('The date the game was played (ISO format).'),
  players: z.array(z.string()).describe('List of players who participated in the game.'),
  winningPlayer: z.string().describe('The player who won the game.'),
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
  Include highlights of key moments, player achievements, and any unexpected twists.

  Game Name: {{{gameName}}}
  Date Played: {{{datePlayed}}}
  Players: {{#each players}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Winning Player: {{{winningPlayer}}}
  Interesting Events: {{{interestingEvents}}}

  Summary:`,
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
