'use server';
/**
 * @fileOverview An AI flow to extract structured session details from transcribed text.
 *
 * - extractSessionDetails - A function that takes transcribed text and returns structured data.
 * - ExtractSessionDetailsInput - The input type for the extractSessionDetails function.
 * - ExtractSessionDetailsOutput - The return type for the extractSessionDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getInitialData } from '@/lib/data';
import type { Game, Player } from '@/lib/types';

// Define the schema for the data we want to extract
const ScoreSchemaFromAI = z.object({
  name: z.string().describe("The name of the player who achieved the score."),
  score: z.coerce.number().optional().describe('The score of the player.'),
});

const FinalScoreSchema = z.object({
  playerId: z.string(),
  score: z.coerce.number().optional(),
});


const ExtractSessionDetailsOutputSchema = z.object({
  gameId: z.string().optional().describe('The ID of the game that was played.'),
  playerIds: z.array(z.string()).optional().describe('An array of IDs for the players who participated.'),
  isCooperative: z.boolean().optional().describe('Whether the game was cooperative.'),
  winnerId: z.string().optional().describe('The ID of the winning player.'),
  cooperativeResult: z.enum(['win', 'loss']).optional().describe("The result if it was a cooperative game."),
  scores: z.array(ScoreSchemaFromAI).optional().describe("An array of player scores, including the player's name."),
  durationInMinutes: z.coerce.number().optional().describe('The total duration of the game in minutes. If the user mentions hours, convert it to minutes.'),
  date: z.string().optional().describe("The date the game was played. If the user says 'yesterday' or 'last Tuesday', resolve it to a specific date in YYYY-MM-DD format. Today's date is " + new Date().toISOString().split('T')[0] + "."),
});
export type ExtractSessionDetailsOutput = z.infer<typeof ExtractSessionDetailsOutputSchema> & {
    scores?: z.infer<typeof FinalScoreSchema>[]; // Override with the final schema
};

const ExtractSessionDetailsInputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the game session.'),
});
export type ExtractSessionDetailsInput = z.infer<typeof ExtractSessionDetailsInputSchema>;

// Caching game and player data to avoid re-reading files on every call
let allGames: Game[] = [];
let allPlayers: Player[] = [];
let dataLoaded = false;

async function loadData() {
    if (!dataLoaded) {
        try {
            const data = await getInitialData();
            allGames = data.games;
            allPlayers = data.players;
            dataLoaded = true;
        } catch (error) {
            console.error('Failed to load initial data in extract-session-details:', error);
        }
    }
}
// Load data at startup
loadData();


// Tool to find a game by name
const findGameByName = ai.defineTool(
    {
      name: 'findGameByName',
      description: 'Finds the ID of a board game from the user\'s collection based on its name.',
      inputSchema: z.object({ name: z.string() }),
      outputSchema: z.object({ gameId: z.string() }),
    },
    async ({ name }) => {
        const lowerCaseName = name.toLowerCase();
        const matchedGame = allGames.find(g => g.name.toLowerCase() === lowerCaseName);
        return { gameId: matchedGame?.id || '' };
    }
);

// Tool to find players by name. This tool ONLY finds existing players.
const findPlayersByNames = ai.defineTool(
    {
        name: 'findPlayersByNames',
        description: "Finds the player IDs for existing players based on their names. Does not create new players.",
        inputSchema: z.object({ names: z.array(z.string()) }),
        outputSchema: z.object({ playerIds: z.array(z.string()) }),
    },
    async ({ names }) => {
        const foundPlayerIds: string[] = [];
        for (const name of names) {
            const lowerCaseName = name.toLowerCase();
            const matchedPlayer = allPlayers.find(p => p.name.toLowerCase() === lowerCaseName);
            if (matchedPlayer) {
                foundPlayerIds.push(matchedPlayer.id);
            }
        }
        return { playerIds: foundPlayerIds };
    }
);


export async function extractSessionDetails(input: ExtractSessionDetailsInput): Promise<ExtractSessionDetailsOutput> {
  return extractDetailsFlow(input);
}

const extractDetailsPrompt = ai.definePrompt({
    name: 'extractDetailsPrompt',
    model: 'googleai/gemini-3-flash-preview',
    tools: [findGameByName, findPlayersByNames],
    input: { schema: ExtractSessionDetailsInputSchema },
    output: { schema: ExtractSessionDetailsOutputSchema },
    prompt: `You are an expert at analyzing game session notes.
Your task is to extract structured information from the provided transcription.
First, use the tools provided to find the correct game ID and player IDs for EXISTING players. Do not invent players who are not in the list.

After using the tools to find the game and player IDs, you MUST proceed to extract all other details from the transcription, including the date, winner or cooperative result, scores, and duration. Do NOT stop after using the tools.

- Identify the game played.
- Identify all EXISTING players who participated.
- Identify the date the game was played. If no date is mentioned, do not return a date.
- Determine if the game was cooperative. If it was, determine if the team won or lost.
- If the game was competitive, identify the winner.
- Extract any scores mentioned for each player. Make sure to include the player's name with their score.
- Extract the game duration. If mentioned in hours, convert it to minutes.

Transcription:
"{{{transcription}}}"`,
});

const extractDetailsFlow = ai.defineFlow(
  {
    name: 'extractDetailsFlow',
    inputSchema: ExtractSessionDetailsInputSchema,
    outputSchema: z.any(), // Use z.any() because we will transform the output
  },
  async (input) => {
    // Ensure latest data is loaded before running
    await loadData();
    const { output } = await extractDetailsPrompt(input);
    if (!output) {
      throw new Error("The AI failed to extract any details from the transcription.");
    }

    // Transform scores to include playerId
    let finalScores: z.infer<typeof FinalScoreSchema>[] = [];
    if (output.scores && output.scores.length > 0) {
        for (const score of output.scores) {
            const lowerCaseName = score.name.toLowerCase();
            const matchedPlayer = allPlayers.find(p => p.name.toLowerCase() === lowerCaseName);
            if (matchedPlayer) {
                finalScores.push({ playerId: matchedPlayer.id, score: score.score });
            }
        }
    } else {
        // Ensure scores is an empty array if not present in output
        finalScores = [];
    }
    
    return {
        ...output,
        scores: finalScores, // Replace the AI's scores with our processed ones
    };
  }
);
