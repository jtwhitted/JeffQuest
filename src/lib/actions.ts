'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game } from './types';

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
});

export async function addGame(values: z.infer<typeof gameFormSchema>): Promise<Game | null> {
    const validatedFields = gameFormSchema.safeParse(values);

    if (!validatedFields.success) {
        // This case should ideally not be hit if client-side validation is working
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        return null;
    }

    // In a real app, you would save this to your database and get a real ID
    const newGame: Game = {
        id: `g${Math.floor(Math.random() * 1000) + 6}`, // semi-random ID for demo
        name: validatedFields.data.name,
        category: 'Uncategorized', // Default category
        imageUrl: `https://picsum.photos/seed/${Math.random()}/600/400`, // Placeholder image
    };
    
    console.log('New game added:', newGame);

    // Since we are not actually persisting this data on the server,
    // we return the new game object so the client can update its state.
    
    // In a real app, you might not need to return it if the client re-fetches after revalidation.
    revalidatePath('/sessions/new');
    revalidatePath('/games');
    
    return newGame;
}
