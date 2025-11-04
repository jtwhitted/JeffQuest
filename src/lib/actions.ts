'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const formSchema = z.object({
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

export async function addSession(values: z.infer<typeof formSchema>) {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Session.',
    };
  }
  
  // In a real application, you would insert the data into your database here.
  // For now, we'll just log it to the console.
  console.log('New session logged:', validatedFields.data);

  // Revalidate the sessions page to show the new data
  revalidatePath('/sessions');
  revalidatePath('/');
}
