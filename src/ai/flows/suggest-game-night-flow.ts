'use server';
/**
 * @fileOverview An AI flow to suggest games for a game night based on players and time.
 * 
 * - suggestGameNight - A function that takes players and time and returns game suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Game, Player, Session } from '@/lib/types';
import { getInitialData } from '@/lib/data';

const CandidateGameSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.array(z.string()).optional(),
    mechanics: z.array(z.string()).optional(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    minPlaytime: z.number().optional(),
    maxPlaytime: z.number().optional(),
    difficulty: z.string().optional(),
    lastPlayed: z.string().optional().describe("The date this game was last played by this group."),
    topPlayer: z.string().optional().describe("The name of the player in this group with the most wins for this game.")
});

const PlayerSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    mostPlayedGame: z.string().optional().describe("The name of this player's most played game."),
    nemesis: z.string().optional().describe("The name of the player this player loses to most often in competitive games.")
});


const SuggestGameNightInputSchema = z.object({
  playerIds: z.array(z.string()).describe("An array of IDs for the players who are present."),
  availableTime: z.number().optional().describe("The maximum available playtime in minutes."),
  mood: z.string().optional().describe("A user's description of the kind of game they are in the mood for (e.g., 'light and cooperative', 'competitive')."),
  isSolo: z.boolean().describe("Whether this is for a single player."),
  candidateGames: z.array(CandidateGameSummarySchema).describe("A summarized array of candidate games that are playable by the current group."),
  attendingPlayers: z.array(PlayerSummarySchema).describe("A summarized array of the players who are attending."),
});
export type SuggestGameNightInput = z.infer<typeof SuggestGameNightInputSchema>;

const RecommendationSchema = z.object({
    gameId: z.string().describe("The unique alphanumeric ID of the recommended game (e.g., 'g1762881557498'). This must be the ID from the input, not the game's name."),
    reason: z.string().describe("A concise, one-sentence explanation for why this game is a good choice for this specific group and situation."),
});

const SuggestGameNightOutputSchema = z.object({
    recommendations: z.array(RecommendationSchema).describe("A ranked list of the top 3 game recommendations."),
});
export type SuggestGameNightOutput = z.infer<typeof SuggestGameNightOutputSchema>;


const suggestGameNightPrompt = ai.definePrompt({
    name: 'suggestGameNightPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: SuggestGameNightInputSchema },
    output: { schema: SuggestGameNightOutputSchema },
    prompt: `You are a board game expert and sommelier. Your task is to recommend the best games for a specific game night from a list of candidate games.

You have been given a list of candidate games and summarized data about the attending players and their history with these games.

**CRITICAL INSTRUCTIONS:**

1.  **ANALYZE & RANK:** From the provided 'candidateGames', analyze the user's 'mood' and the summarized player/game history to select the top 3 best recommendations. You MUST recommend the top 3 games from the provided list, even if the mood match is not perfect. Do NOT recommend the same game more than once.
2.  **PROVIDE REASONING:** For each of your top 3 recommendations, you MUST provide a concise, compelling, one-sentence 'reason' explaining *why* it's a great choice for *this specific group* and *this specific situation*. Consider things like:
    - Does it match the 'mood' (e.g., cooperative, competitive, light, heavy)?
    - If 'isSolo' is true, prioritize games that offer a strong single-player experience.
    - Does it match a player's stated 'mostPlayedGame' preference?
    - Is it a good counter-pick against a player's 'nemesis'?
    - Has it not been played in a while (using 'lastPlayed')? Maybe it's time to bring it back.
    - Is there a 'topPlayer' for this game in the group? Mention them if relevant.

**USER PREFERENCES:**
- Group Mood: {{#if mood}}'{{mood}}'{{else}}Not specified{{/if}}
- Solo Session: {{isSolo}}

**PLAYER DATA:**
{{#each attendingPlayers}}
- Name: {{this.name}}, Most Played: {{#if this.mostPlayedGame}}{{this.mostPlayedGame}}{{else}}N/A{{/if}}, Nemesis: {{#if this.nemesis}}{{this.nemesis}}{{else}}N/A{{/if}}
{{/each}}

**CANDIDATE GAMES (with play history):**
{{#each candidateGames}}
- Name: {{this.name}}, Last Played: {{#if this.lastPlayed}}{{this.lastPlayed}}{{else}}Never{{/if}}, Top Player: {{#if this.topPlayer}}{{this.topPlayer}}{{else}}None{{/if}}
{{/each}}
`,
});


export const suggestGameNightFlow = ai.defineFlow(
  {
    name: 'suggestGameNightFlow',
    inputSchema: SuggestGameNightInputSchema,
    outputSchema: SuggestGameNightOutputSchema,
  },
  async (input) => {
    
    if (input.candidateGames.length === 0) {
        throw new Error("No suitable games were found in your collection based on the player count and time constraints.");
    }
    
    const { output } = await suggestGameNightPrompt({ ...input });
    
    if (!output || !output.recommendations || output.recommendations.length === 0) {
      // This will now be caught by the action and displayed in the UI.
      throw new Error('The AI was unable to generate any game suggestions for this request.');
    }
    
    // Additional safeguard to ensure uniqueness, though the prompt should handle it.
    const uniqueGameIds = new Set<string>();
    const uniqueRecommendations = output.recommendations.filter(rec => {
        if (!rec.gameId || uniqueGameIds.has(rec.gameId)) {
            return false;
        }
        uniqueGameIds.add(rec.gameId);
        return true;
    });

    return { recommendations: uniqueRecommendations.slice(0, 3) };
  }
);