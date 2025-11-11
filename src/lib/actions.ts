
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

function decodeHtmlEntities(text: string): string {
    if (typeof text !== 'string') return text;
    return text.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
    }).replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    }).replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&#039;/g, "'");
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

export async function addGame(values: z.infer<typeof gameFormSchema>): Promise<Game> {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }
    
    // If all details are provided, it's a manual entry
    if (validatedFields.data.description !== undefined) {
        const manualData = validatedFields.data;
        const newGame: Game = {
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
            // BGG specific fields are omitted
            rating: undefined,
            ratingCount: undefined,
            complexity: undefined,
            designers: manualData.designers || [],
            publishers: manualData.publishers || [],
        };
        await addGameToDB(newGame);
        revalidatePath('/games');
        revalidatePath('/sessions/new');
        return newGame;
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
        name: decodeHtmlEntities(details?.name || name),
        category: details?.category || [],
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
