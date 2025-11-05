'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player, Session } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { 
    games as dbGames, 
    players as dbPlayers, 
    sessions as dbSessions,
    addGameToDB,
    addSessionToDB,
    addPlayerToDB,
    deleteGameFromDB,
    deletePlayerFromDB
} from './data';
import { unstable_noStore as noStore } from 'next/cache';

// Data fetching functions
export async function getGames(): Promise<Game[]> {
  noStore();
  const gamesWithImages = dbGames.map(game => {
    const placeholder = PlaceHolderImages.find(p => p.id === `game-${game.id.substring(1)}`);
    return {
        ...game,
        imageUrl: game.imageUrl || placeholder?.imageUrl || PlaceHolderImages.find(p => p.id.startsWith('game-'))?.imageUrl || ''
    }
  });
  return Promise.resolve(gamesWithImages);
}

export async function getPlayers(): Promise<Player[]> {
  noStore();
  const playersWithImages = dbPlayers.map(player => ({
    ...player,
    avatarUrl: player.avatarUrl || PlaceHolderImages.find(p => p.imageHint.includes('portrait'))?.imageUrl || ''
  }));
  return Promise.resolve(playersWithImages);
}

export async function getSessions(): Promise<Session[]> {
  noStore();
  return Promise.resolve(dbSessions);
}

export async function getGameById(id: string): Promise<Game | undefined> {
    noStore();
    const game = dbGames.find(g => g.id === id);
    if (game) {
      const placeholder = PlaceHolderImages.find(p => p.id === `game-${game.id.substring(1)}`);
      return {
        ...game,
        imageUrl: game.imageUrl || placeholder?.imageUrl || PlaceHolderImages.find(p => p.id.startsWith('game-'))?.imageUrl || ''
      };
    }
    return undefined;
}

export async function getSessionById(id: string): Promise<Session | undefined> {
    noStore();
    return Promise.resolve(dbSessions.find(s => s.id === id));
}

export async function getPlayerById(id: string): Promise<Player | undefined> {
    noStore();
    return Promise.resolve(dbPlayers.find(p => p.id === id));
}


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
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Session.',
    };
  }
  
  const newSession: Session = {
    id: `s${Math.random().toString(36).substring(2, 9)}`,
    ...validatedFields.data,
    date: validatedFields.data.date.toISOString(),
  };

  addSessionToDB(newSession);

  revalidatePath('/sessions');
  revalidatePath('/');
  revalidatePath('/games');
  revalidatePath('/players');
}


const gameFormSchema = z.object({
    name: z.string().min(1, 'Game name is required.'),
    category: z.string().min(1, 'Category is required.'),
    mechanics: z.array(z.string()).optional(),
    minPlayers: z.coerce.number().min(1),
    maxPlayers: z.coerce.number().min(1),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
    yearPublished: z.coerce.number().optional(),
    description: z.string().optional(),
    minPlaytime: z.coerce.number().optional(),
    maxPlaytime: z.coerce.number().optional(),
    rating: z.coerce.number().optional(),
    ratingCount: z.coerce.number().optional(),
    complexity: z.coerce.number().optional(),
    designers: z.array(z.string()).optional(),
    publishers: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
});

export async function addGame(values: z.infer<typeof gameFormSchema>) {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }
    
    const { name, imageUrl, ...rest } = validatedFields.data;
    
    const newGame: Game = {
        id: `g${Date.now().toString()}`,
        name,
        imageUrl: imageUrl || PlaceHolderImages.find(img => img.id.startsWith('game-'))?.imageUrl || 'https://picsum.photos/seed/default/300/300',
        ...rest
    };
    
    addGameToDB(newGame);
    
    revalidatePath('/games');
    revalidatePath('/sessions/new');
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

    const randomImage = PlaceHolderImages.find(p => p.imageHint.includes('portrait'));

    const newPlayer: Player = {
        id: `p${Date.now().toString()}`,
        name,
        avatarUrl: avatarUrl || randomImage?.imageUrl || '',
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
