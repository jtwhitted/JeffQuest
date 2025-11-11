
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
});

export async function addGame(values: z.infer<typeof gameFormSchema>): Promise<Game> {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }
    
    let { name, bggId } = validatedFields.data;
    let details: Awaited<ReturnType<typeof getBggDetails>>[number] | null = null;

    try {
        if (bggId) {
            const results = await getBggDetails(bggId);
            details = results.length > 0 ? results[0] : null;
        } else {
             const searchResults = await searchBgg(name);
            if (searchResults.length > 0) {
                const ids = searchResults.map(r => r.id);
                const allDetails = await getBggDetails(ids.join(','));

                if (allDetails.length > 0) {
                    details = allDetails.reduce((prev, current) => {
                        return (prev.ratingCount || 0) > (current.ratingCount || 0) ? prev : current;
                    });
                }
            }
        }
    } catch (bggError) {
        console.error("BGG data fetching failed:", bggError);
    }
    
    const newGame: Game = {
        id: `g${Date.now()}`,
        name: details?.name || name,
        category: details?.category || 'Unknown',
        mechanics: details?.mechanics || [],
        minPlayers: details?.minPlayers || 1,
        maxPlayers: details?.maxPlayers || 1,
        difficulty: details?.difficulty as Game['difficulty'] || 'Intermediate',
        yearPublished: details?.yearPublished,
        description: details?.description || 'No description available.',
        minPlaytime: details?.minPlaytime,
        maxPlaytime: details?.maxPlaytime,
        rating: details?.rating,
        ratingCount: details?.ratingCount,
        complexity: details?.complexity,
        designers: details?.designers || [],
        publishers: details?.publishers || [],
        imageUrl: details?.imageUrl || '',
    };
    
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


export async function searchBggAction(query: string): Promise<{ id: string; name: string }[]> {
  if (!query) return [];
  try {
    const results = await searchBgg(query);
    return results;
  } catch (error) {
    console.error('BGG search action failed:', error);
    return [];
  }
}
