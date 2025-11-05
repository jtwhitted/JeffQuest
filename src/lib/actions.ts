
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player, Session } from './types';
import { 
    addGameToDB,
    addSessionToDB,
    addPlayerToDB,
    deleteGameFromDB,
    deletePlayerFromDB
} from './data';
import { searchBgg, getBggGameDetails } from './bgg';

// Server Actions for data mutation

const sessionFormSchema = z.object({
  gameId: z.string().min(1, 'Please select a game.'),
  date: z.date(),
  playerIds: z.array(z.string()).min(1, 'Please select at least one player.'),
  isCooperative: z.boolean(),
  winnerId: z.string().optional(),
  cooperativeResult: z.enum(['win', 'loss']).optional(),
  scores: z.array(z.object({
      playerId: z.string(),
      score: z.number().optional(),
  })).optional(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.isCooperative) {
        return !!data.cooperativeResult;
    }
    if (data.playerIds.length > 0) {
        return !!data.winnerId;
    }
    return true;
}, {
    message: "A winner or a cooperative result must be selected.",
    path: ['winnerId'],
});


export async function addSession(values: z.infer<typeof sessionFormSchema>) {
  const validatedFields = sessionFormSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error('Invalid session data.');
  }
  
  const newSessionData = {
    id: `s${Date.now()}`,
    ...validatedFields.data,
    date: validatedFields.data.date.toISOString(),
  };

  const newSession = await addSessionToDB(newSessionData);

  revalidatePath('/sessions');
  revalidatePath('/');
  revalidatePath('/games');
  revalidatePath('/players');

  return newSession;
}


const gameFormSchema = z.object({
    name: z.string().min(1, 'Game name is required.'),
});

export async function addGame(values: z.infer<typeof gameFormSchema>): Promise<Game> {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }
    
    const gameData = validatedFields.data;
    
    // The BGG Search API is not reliable, so we will add the game with minimal details.
    // The rich data can be added later if a manual BGG ID entry is implemented.
    const newGame: Game = {
        id: `g${Date.now()}`,
        name: gameData.name,
        category: 'Unknown',
        mechanics: [],
        minPlayers: 1,
        maxPlayers: 1,
        difficulty: 'Intermediate',
        yearPublished: undefined,
        description: 'No description available.',
        minPlaytime: undefined,
        maxPlaytime: undefined,
        rating: undefined,
        ratingCount: undefined,
        complexity: undefined,
        designers: [],
        publishers: [],
        imageUrl: '',
    };
    
    await addGameToDB(newGame);
    
    revalidatePath('/games');
    revalidatePath('/sessions/new');
    
    return newGame;
}

export async function deleteGame(gameId: string) {
    await deleteGameFromDB(gameId);
    
    revalidatePath('/games');
    revalidatePath(`/games/${gameId}`);
    revalidatePath('/');
    revalidatePath('/sessions');
}

const playerFormSchema = z.object({
    name: z.string().min(1, 'Player name is required.').max(50, 'Name must be 50 characters or less.'),
    avatarUrl: z.string().optional(),
});

export async function addPlayer(values: z.infer<typeof playerFormSchema>) {
    const validatedFields = playerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid player data.');
    }
    
    const { name, avatarUrl } = validatedFields.data;

    const newPlayer: Player = {
        id: `p${Date.now()}`,
        name,
        avatarUrl: avatarUrl || '',
    };

    await addPlayerToDB(newPlayer);
    
    revalidatePath('/players');
    revalidatePath('/sessions/new');
    return newPlayer;
}

export async function deletePlayer(playerId: string) {
    await deletePlayerFromDB(playerId);
    
    revalidatePath('/players');
    revalidatePath('/');
    revalidatePath('/sessions');
}
