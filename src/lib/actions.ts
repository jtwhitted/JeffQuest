
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
  
  const newSession: Session = {
    id: `s${Math.random().toString(36).substring(2, 9)}`,
    ...validatedFields.data,
    date: validatedFields.data.date.toISOString(),
  };

  const newSessionWithDate = addSessionToDB(newSession);

  revalidatePath('/sessions');
  revalidatePath('/');
  revalidatePath('/games');
  revalidatePath('/players');

  return newSessionWithDate;
}


const gameFormSchema = z.object({
    name: z.string().min(1, 'Game name is required.'),
    category: z.string().optional(),
    minPlayers: z.coerce.number().optional(),
    maxPlayers: z.coerce.number().optional(),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
});

export async function addGame(values: z.infer<typeof gameFormSchema>): Promise<Game> {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }
    
    const gameData = validatedFields.data;
    
    // Fetch details from BGG
    const bggId = await searchBgg(gameData.name);
    let bggDetails = null;
    if (bggId) {
        bggDetails = await getBggGameDetails(bggId);
    }

    const newGame: Game = {
        id: `g${Date.now().toString()}`,
        name: gameData.name,
        // Use BGG details if available, otherwise use form fallbacks
        category: bggDetails?.category || gameData.category || 'Unknown',
        mechanics: bggDetails?.mechanics || [],
        minPlayers: bggDetails?.minPlayers || gameData.minPlayers || 1,
        maxPlayers: bggDetails?.maxPlayers || gameData.maxPlayers || 1,
        difficulty: gameData.difficulty || bggDetails?.difficulty || 'Intermediate',
        yearPublished: bggDetails?.yearPublished,
        description: bggDetails?.description,
        minPlaytime: bggDetails?.minPlaytime,
        maxPlaytime: bggDetails?.maxPlaytime,
        rating: bggDetails?.rating,
        ratingCount: bggDetails?.ratingCount,
        complexity: bggDetails?.complexity,
        designers: bggDetails?.designers || [],
        publishers: bggDetails?.publishers || [],
        imageUrl: bggDetails?.imageUrl || '',
    };
    
    addGameToDB(newGame);
    
    revalidatePath('/games');
    revalidatePath('/sessions/new');
    
    return newGame;
}

export async function deleteGame(gameId: string) {
    deleteGameFromDB(gameId);
    
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
        id: `p${Date.now().toString()}`,
        name,
        avatarUrl: avatarUrl || '',
    };

    addPlayerToDB(newPlayer);
    
    revalidatePath('/players');
    revalidatePath('/sessions/new');
    return newPlayer;
}

export async function deletePlayer(playerId: string) {
    deletePlayerFromDB(playerId);
    
    revalidatePath('/players');
    revalidatePath('/');
    revalidatePath('/sessions');
}
