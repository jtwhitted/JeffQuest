'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player } from './types';
import { PlaceHolderImages } from './placeholder-images';

const sessionFormSchema = z.object({
  gameId: z.string(),
  date: z.date(),
  playerIds: z.array(z.string()),
  winnerId: z.string(),
  scores: z.array(z.object({
      playerId: z.string(),
      score: z.number().optional(),
  })).optional(),
  notes: z.string().optional(),
});

export async function addSession(values: z.infer<typeof sessionFormSchema>) {
  const validatedFields = sessionFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Session.',
    };
  }
  
  // In a real application, you would insert the data into your database here.
  console.log('New session logged:', validatedFields.data);

  // Revalidate paths to show the new data
  revalidatePath('/sessions');
  revalidatePath('/');
  revalidatePath('/games');
  revalidatePath('/players');
}


const gameFormSchema = z.object({
    name: z.string().min(1, 'Game name is required.'),
    category: z.string().min(1, 'Category is required.'),
    minPlayers: z.coerce.number().min(1),
    maxPlayers: z.coerce.number().min(1),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
});

export async function addGame(values: z.infer<typeof gameFormSchema>): Promise<Game | null> {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        // This case should ideally not be hit if client-side validation is working
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        return null;
    }
    
    const { name, category, minPlayers, maxPlayers, difficulty } = validatedFields.data;
    const randomImage = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    // In a real app, you would save this to your database and get a real ID
    const newGame: Game = {
        id: `g${Math.floor(Math.random() * 1000) + 6}`, // semi-random ID for demo
        name,
        category,
        minPlayers,
        maxPlayers,
        difficulty,
        imageUrl: randomImage.imageUrl,
    };
    
    console.log('New game added:', newGame);

    // Since we are not actually persisting this data on the server,
    // we return the new game object so the client can update its state.
    
    // In a real app, you might not need to return it if the client re-fetches after revalidation.
    revalidatePath('/sessions/new');
    revalidatePath('/games');
    
    return newGame;
}

export async function deleteGame(gameId: string) {
    console.log(`Deleting game with id: ${gameId}`);
    // In a real app, you would delete from the database here.
    
    // Revalidate paths to update the UI
    revalidatePath('/games');
    revalidatePath('/');
    revalidatePath('/sessions');
}

const playerFormSchema = z.object({
    name: z.string().min(1, 'Player name is required.').max(50, 'Name must be 50 characters or less.'),
});

export async function addPlayer(values: z.infer<typeof playerFormSchema>): Promise<Player | null> {
    const validatedFields = playerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        return null;
    }

    const randomImage = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    const newPlayer: Player = {
        id: `p${Math.floor(Math.random() * 1000) + 5}`, // semi-random ID for demo
        name: validatedFields.data.name,
        avatarUrl: randomImage.imageUrl,
    };

    console.log('New player added:', newPlayer);
    
    revalidatePath('/sessions/new');
    revalidatePath('/players');

    return newPlayer;
}

export async function deletePlayer(playerId: string) {
    console.log(`Deleting player with id: ${playerId}`);
    // In a real app, you would delete from the database here.
    
    // Revalidate paths to update the UI
    revalidatePath('/players');
    revalidatePath('/');
    revalidatePath('/sessions');
}
