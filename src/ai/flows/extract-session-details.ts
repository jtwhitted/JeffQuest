
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
import { getInitialData, addPlayerToDB } from '@/lib/data';
import type { Game, Player } from '@/lib/types';

// Helper function to find the best match for a string in an array of strings.
// This is a simplified similarity check.
function findBestMatch(str: string, target: string[]): { bestMatch: { target: string } | null } {
    if (!str || !target || target.length === 0) {
        return { bestMatch: null };
    }

    let bestMatch = { target: '', rating: 0 };
    const lowerCaseStr = str.toLowerCase();

    for (const t of target) {
        const lowerCaseTarget = t.toLowerCase();
        let rating = 0;
        
        // Simple similarity check based on character overlap and substrings
        if (lowerCaseTarget.includes(lowerCaseStr) || lowerCaseStr.includes(lowerCaseTarget)) {
            rating = Math.max(lowerCaseStr.length, lowerCaseTarget.length);
        }

        if (rating > bestMatch.rating) {
            bestMatch = { target: t, rating: rating };
        }
    }

    return bestMatch.rating > 0 ? { bestMatch: { target: bestMatch.target } } : { bestMatch: null };
}

// Define the schema for the data we want to extract
const ScoreSchema = z.object({
  playerId: z.string().describe('The unique ID of the player.'),
  score: z.coerce.number().optional().describe('The score of the player.'),
});

const ExtractSessionDetailsOutputSchema = z.object({
  gameId: z.string().optional().describe('The ID of the game that was played.'),
  playerIds: z.array(z.string()).optional().describe('An array of IDs for the players who participated.'),
  isCooperative: z.boolean().optional().describe('Whether the game was cooperative.'),
  winnerId: z.string().optional().describe('The ID of the winning player.'),
  cooperativeResult: z.enum(['win', 'loss']).optional().describe("The result if it was a cooperative game."),
  scores: z.array(ScoreSchema).optional().describe('An array of player scores.'),
  durationInMinutes: z.coerce.number().optional().describe('The total duration of the game in minutes. If the user mentions hours, convert it to minutes.'),
  date: z.string().optional().describe("The date the game was played. If the user says 'yesterday' or 'last Tuesday', resolve it to a specific date in YYYY-MM-DD format. Today's date is " + new Date().toISOString().split('T')[0] + "."),
});
export type ExtractSessionDetailsOutput = z.infer<typeof ExtractSessionDetailsOutputSchema>;

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
        const data = await getInitialData();
        allGames = data.games;
        allPlayers = data.players;
        dataLoaded = true;
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
        const gameNames = allGames.map(g => g.name);
        const bestMatch = findBestMatch(name, gameNames);
        const matchedGame = allGames.find(g => g.name === bestMatch.bestMatch?.target);
        return { gameId: matchedGame?.id || '' };
    }
);

// Tool to find players by name, and create them if they don't exist
const findAndCreatePlayersByNames = ai.defineTool(
    {
      name: 'findAndCreatePlayersByNames',
      description: "Finds player IDs based on names. If a player doesn't exist, they are created.",
      inputSchema: z.object({ names: z.array(z.string()) }),
      outputSchema: z.object({ playerIds: z.array(z.string()) }),
    },
    async ({ names }) => {
        const playerIds: string[] = [];
        
        for (const name of names) {
            const playerNames = allPlayers.map(p => p.name);
            const bestMatch = findBestMatch(name, playerNames);
            let matchedPlayer = allPlayers.find(p => p.name === bestMatch.bestMatch?.target);
            
            if (matchedPlayer) {
                playerIds.push(matchedPlayer.id);
            } else {
                // Player not found, create a new one
                try {
                    const newPlayer = await addPlayerToDB({
                        id: `p${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        name: name,
                        avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(name)}`,
                    });
                    // Add to our in-memory list for this session and add their new ID
                    allPlayers.push(newPlayer);
                    playerIds.push(newPlayer.id);
                } catch (error) {
                    console.error(`Failed to create new player "${name}":`, error);
                    // Decide if you want to throw or just skip this player
                }
            }
        }
        return { playerIds };
    }
);


export async function extractSessionDetails(input: ExtractSessionDetailsInput): Promise<ExtractSessionDetailsOutput> {
  return extractDetailsFlow(input);
}

const extractDetailsPrompt = ai.definePrompt({
    name: 'extractDetailsPrompt',
    model: 'googleai/gemini-2.5-flash',
    tools: [findGameByName, findAndCreatePlayersByNames],
    input: { schema: ExtractSessionDetailsInputSchema },
    output: { schema: ExtractSessionDetailsOutputSchema },
    prompt: `You are an expert at analyzing game session notes.
Your task is to extract structured information from the provided transcription.
Use the tools provided to find the correct game and player IDs. If new players are mentioned, the tool will create them.

- Identify the game played.
- Identify all players who participated.
- Identify the date the game was played. If no date is mentioned, do not return a date.
- Determine if the game was cooperative. If it was, determine if the team won or lost.
- If the game was competitive, identify the winner.
- Extract any scores mentioned for each player.
- Extract the game duration. If mentioned in hours, convert it to minutes.

Transcription:
"{{{transcription}}}"`,
});

const extractDetailsFlow = ai.defineFlow(
  {
    name: 'extractDetailsFlow',
    inputSchema: ExtractSessionDetailsInputSchema,
    outputSchema: ExtractSessionDetailsOutputSchema,
  },
  async (input) => {
    // Ensure latest data is loaded before running
    await loadData();
    const { output } = await extractDetailsPrompt(input);
    if (!output) {
      throw new Error("The AI failed to extract any details from the transcription.");
    }
    return output;
  }
);
