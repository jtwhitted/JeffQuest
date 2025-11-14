
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player, Session } from './types';
import { 
    addGameToDB,
    addSessionToDB,
    addPlayerToDB,
    deleteGameFromDB,
    deletePlayerFromDB,
    deleteSessionFromDB
} from './data';
import { searchBgg, getBggDetails } from './bgg';

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
    bggId: z.string().optional(),
    // Manual fields
    description: z.string().optional(),
    yearPublished: z.number().optional(),
    minPlayers: z.number().optional(),
    maxPlayers: z.number().optional(),
    minPlaytime: z.number().optional(),
    maxPlaytime: z.number().optional(),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
    category: z.array(z.string()).optional(),
    mechanics: z.array(z.string()).optional(),
    designers: z.array(z.string()).optional(),
    publishers: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
});

export async function addGame(gameData: z.infer<typeof gameFormSchema>): Promise<Game> {
    const validatedFields = gameFormSchema.safeParse(gameData);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }

    let newGame: Game;

    if (validatedFields.data.bggId) {
        const bggDetails = await getBggDetails(validatedFields.data.bggId);
        if (bggDetails.length === 0) {
            throw new Error(`Could not find details for BGG ID ${validatedFields.data.bggId}`);
        }
        newGame = {
            id: `g${Date.now()}`,
            name: validatedFields.data.name,
            ...bggDetails[0]
        };
    } else {
        // Manual entry
        const manualData = validatedFields.data;
        newGame = {
            id: `g${Date.now()}`,
            name: manualData.name,
            category: manualData.category || [],
            mechanics: manualData.mechanics || [],
            minPlayers: manualData.minPlayers || 1,
            maxPlayers: manualData.maxPlayers || 1,
            difficulty: manualData.difficulty || 'Intermediate',
            yearPublished: manualData.yearPublished,
            description: manualData.description || 'No description available.',
            minPlaytime: manualData.minPlaytime,
            maxPlaytime: manualData.maxPlaytime,
            imageUrl: manualData.imageUrl || '',
            designers: manualData.designers || [],
            publishers: manualData.publishers || [],
        };
    }
    
    await addGameToDB(newGame);
    revalidatePath('/games');
    revalidatePath('/sessions/new');
    return newGame;
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
        avatarUrl: avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    };

    await addPlayerToDB(newPlayer);
    
    revalidatePath('/players');
    revalidatePath('/sessions/new');
    return newPlayer;
}

export async function deleteGame(gameId: string) {
    await deleteGameFromDB(gameId);

    revalidatePath('/games');
    revalidatePath('/');
    revalidatePath('/sessions');
}

export async function deletePlayer(playerId: string) {
    await deletePlayerFromDB(playerId);
    
    revalidatePath('/players');
    revalidatePath('/');
    revalidatePath('/sessions');
}

export async function deleteSessionAction(sessionId: string) {
    await deleteSessionFromDB(sessionId);

    revalidatePath('/sessions');
    revalidatePath('/');
    revalidatePath('/games');
    revalidatePath('/players');
}


export async function searchBggAction(query: string): Promise<Partial<Game>[]> {
  if (!query) return [];
  try {
    const searchResults = await searchBgg(query);
    if (searchResults.length === 0) {
      return [];
    }

    const ids = searchResults.map(r => r.id).join(',');
    const details = await getBggDetails(ids);
    
    if (details.length > 0) {
        return details;
    }
    
    return [];

  } catch (error) {
    console.error('BGG search action failed:', error);
    return [];
  }
}

export async function getBggDetailsAction(ids: string): Promise<Partial<Game & {id: string}>[]> {
  if (!ids) return [];
  try {
    const details = await getBggDetails(ids);
    return details;
  } catch (error) {
    console.error('BGG details action failed:', error);
    return [];
  }
}
