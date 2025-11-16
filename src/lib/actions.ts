
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player, Session, RulebookDocument } from './types';
import { 
    addGameToDB,
    addSessionToDB,
    addPlayerToDB,
    deleteGameFromDB,
    deletePlayerFromDB,
    deleteSessionFromDB,
    updatePlayerInDB,
    getInitialData,
    updateGameInDB
} from './data';
import { searchBgg, getBggDetails, getBggCollection, getBggPlayHistory, BggPlay } from './bgg';
import pdf from 'pdf-parse';

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
  duration: z.coerce.number().optional(),
}).refine(data => {
    if (data.isCooperative) {
        // Cooperative games don't require a winner, but should have a result
        return true;
    }
    if (data.playerIds.length > 0 && !data.isCooperative) {
        return !!data.winnerId;
    }
    return true;
}, {
    message: "A winner must be selected for competitive games.",
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
        // Fetch full details including stats for the single selected game.
        const bggDetails = await getBggDetails([validatedFields.data.bggId], true);
        if (bggDetails.length === 0) {
            throw new Error(`Could not find details for BGG ID ${validatedFields.data.bggId}`);
        }
        newGame = {
            id: `g${Date.now()}`,
            name: validatedFields.data.name, // Use the name from the selected result
            ...bggDetails[0],
            bggId: validatedFields.data.bggId,
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
    
    const addedGame = await addGameToDB(newGame);
    revalidatePath('/games');
    revalidatePath('/sessions/new');
    return addedGame;
}


const playerFormSchema = z.object({
    name: z.string().min(1, 'Player name is required.').max(50, 'Name must be 50 characters or less.'),
    avatarUrl: z.string().optional(),
    bggUsername: z.string().optional(),
});

export async function addPlayer(values: z.infer<typeof playerFormSchema>) {
    const validatedFields = playerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid player data.');
    }
    
    const { name, avatarUrl, bggUsername } = validatedFields.data;

    const newPlayer: Player = {
        id: `p${Date.now()}`,
        name,
        avatarUrl: avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(name)}`,
        bggUsername: bggUsername || undefined,
    };

    await addPlayerToDB(newPlayer);
    
    revalidatePath('/players');
    revalidatePath('/sessions/new');
    return newPlayer;
}

const updatePlayerSchema = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  legendaryTitle: z.string().optional(),
  legendaryBio: z.string().optional(),
  bggUsername: z.string().optional(),
});

export async function updatePlayerAction(playerId: string, values: z.infer<typeof updatePlayerSchema>) {
    const validatedFields = updatePlayerSchema.safeParse(values);

    if (!validatedFields.success) {
        throw new Error('Invalid player data for update.');
    }
    
    const updatedPlayer = await updatePlayerInDB(playerId, validatedFields.data);

    revalidatePath('/players');
    revalidatePath(`/players/${playerId}`); // Assuming a detail page exists
    revalidatePath('/');
    
    return updatedPlayer;
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
  if (!query) {
    return [];
  }
  try {
    const searchResults = await searchBgg(query);
    if (!searchResults || searchResults.length === 0) {
      return [];
    }
    // Fetch with stats to enable popularity sorting
    const ids = searchResults.map(r => r.id);
    const details = await getBggDetails(ids, true);
    
    // Filter out unpopular results
    return details.filter(d => (d.ratingCount || 0) > 50);

  } catch (error) {
    console.error('BGG search action failed:', error);
    // Return empty array on failure so the UI can handle it gracefully
    return [];
  }
}

export async function getBggDetailsAction(ids: string): Promise<Partial<Game & {id: string}>[]> {
  if (!ids) return [];
  try {
    const details = await getBggDetails(ids.split(','), true);
    return details;
  } catch (error) {
    console.error('BGG details action failed:', error);
    return [];
  }
}

export async function importBggCollectionAction(username: string): Promise<{ importedCount: number }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }

    try {
        // 1. Fetch collection IDs from BGG
        const collectionItems = await getBggCollection(username);
        const bggIds = collectionItems.map(item => item.bggId);
        if (bggIds.length === 0) {
            return { importedCount: 0 };
        }

        // 2. Get current games from our DB
        const { games: currentGames } = await getInitialData();
        const currentBggIds = new Set(currentGames.map(g => g.bggId).filter(Boolean));

        // 3. Find which games are new
        const newBggIds = bggIds.filter(id => !currentBggIds.has(id));
        
        if (newBggIds.length === 0) {
            return { importedCount: 0 };
        }
        
        // 4. Fetch details for the new games
        const newGamesDetails = await getBggDetails(newBggIds, true);
        
        // 5. Add new games to our DB
        for (const gameDetails of newGamesDetails) {
            const newGame: Game = {
                id: `g${Date.now()}-${Math.random()}`,
                ...gameDetails,
                name: gameDetails.name || 'Unknown Name',
                category: gameDetails.category || [],
                imageUrl: gameDetails.imageUrl || '',
                minPlayers: gameDetails.minPlayers || 1,
                maxPlayers: gameDetails.maxPlayers || 1,
                bggId: gameDetails.id,
            };
            await addGameToDB(newGame);
        }

        // 6. Revalidate path and return count
        revalidatePath('/games');
        return { importedCount: newGamesDetails.length };

    } catch (error: any) {
        console.error('BGG collection import failed:', error);
        throw new Error(error.message || 'Failed to import collection from BGG.');
    }
}

export async function importBggPlaysAction(username: string): Promise<{ importedCount: number }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }

    try {
        const { games, players } = await getInitialData();
        const bggPlays = await getBggPlayHistory(username);

        let importedCount = 0;

        for (const play of bggPlays) {
            const game = games.find(g => g.bggId === play.bggGameId);
            if (!game) continue; // Skip plays for games not in our collection

            const playerIds: string[] = [];
            const scores: { playerId: string; score?: number }[] = [];
            let winnerId: string | undefined;

            for (const playPlayer of play.players) {
                // Try to find player by BGG username first, then by name
                let player = players.find(p => p.bggUsername && p.bggUsername.toLowerCase() === playPlayer.bggUsername?.toLowerCase());
                if (!player) {
                    player = players.find(p => p.name.toLowerCase() === playPlayer.name.toLowerCase());
                }
                
                if (player) {
                    playerIds.push(player.id);
                    if (playPlayer.score) {
                        scores.push({ playerId: player.id, score: playPlayer.score });
                    }
                    if (playPlayer.win) {
                        winnerId = player.id;
                    }
                }
            }
            
            if (playerIds.length === 0) continue; // Skip if we can't match any players

            const isCooperative = game.mechanics?.includes('Cooperative Game') || false;
            let cooperativeResult: 'win' | 'loss' | undefined = undefined;

            if (isCooperative) {
                // For co-op games, if anyone is marked as a winner, it's a team win.
                if (play.players.some(p => p.win)) {
                    cooperativeResult = 'win';
                } else {
                    cooperativeResult = 'loss';
                }
                winnerId = undefined; // Clear individual winner for co-op
            }


            const newSession: Session = {
                id: `s-bgg-${play.bggPlayId}`,
                gameId: game.id,
                date: play.date,
                playerIds,
                winnerId,
                cooperativeResult,
                scores,
                notes: play.notes,
                duration: play.duration,
                isCooperative,
            };

            await addSessionToDB(newSession);
importedCount++;
        }
        
        revalidatePath('/sessions');
        revalidatePath('/');

        return { importedCount };
    } catch (error: any) {
        console.error('BGG play history import failed:', error);
        throw new Error(error.message || 'Failed to import play history from BGG.');
    }
}


export async function importBggRatingsAction(username: string, playerId: string): Promise<{ updatedCount: number }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }
     if (!playerId) {
        throw new Error('Player ID is required to associate the rating.');
    }

    try {
        const bggCollection = await getBggCollection(username);
        if (bggCollection.length === 0) {
            return { updatedCount: 0 };
        }

        const { games: currentGames } = await getInitialData();
        let updatedCount = 0;

        for (const game of currentGames) {
            if (game.bggId) {
                const bggItem = bggCollection.find(item => item.bggId === game.bggId);
                if (bggItem && bggItem.userRating !== undefined) {
                    
                    const newRatings = {
                        ...(game.userRatings || {}),
                        [playerId]: bggItem.userRating
                    };

                    if (game.userRatings?.[playerId] !== bggItem.userRating) {
                        await updateGameInDB(game.id, { userRatings: newRatings });
                        updatedCount++;
                    }
                }
            }
        }
        
        revalidatePath('/games');
        revalidatePath('/players');

        return { updatedCount };

    } catch (error: any) {
        console.error('BGG ratings import failed:', error);
        throw new Error(error.message || 'Failed to import ratings from BGG.');
    }
}



export async function handleRulebookUpload(gameId: string, documentName: string, pdfDataUri: string): Promise<Game> {
    if (!pdfDataUri.startsWith('data:application/pdf;base64,')) {
        throw new Error('Invalid PDF data format.');
    }
    if (!documentName.trim()) {
        throw new Error('Document name cannot be empty.');
    }


    try {
        const base64Data = pdfDataUri.replace(/^data:application\/pdf;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const data = await pdf(buffer);
        const textContent = data.text;

        if (!textContent) {
            throw new Error('Could not extract any text from the PDF.');
        }
        
        const { games } = await getInitialData();
        const game = games.find(g => g.id === gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        const newDocument: RulebookDocument = {
            id: `doc-${Date.now()}`,
            name: documentName,
            text: textContent,
        };

        const updatedDocuments = [...(game.documents || []), newDocument];
        
        const updatedGame = await updateGameInDB(gameId, { documents: updatedDocuments });
        
        revalidatePath(`/games/${gameId}`);

        return updatedGame;
    } catch (error) {
        console.error('PDF parsing or saving error:', error);
        throw new Error('Failed to process the PDF file.');
    }
}


export async function deleteRulebookDocument(gameId: string, documentId: string): Promise<Game> {
    const { games } = await getInitialData();
    const game = games.find(g => g.id === gameId);
    if (!game) {
        throw new Error('Game not found');
    }

    const updatedDocuments = game.documents?.filter(doc => doc.id !== documentId) || [];

    const updatedGame = await updateGameInDB(gameId, { documents: updatedDocuments });

    revalidatePath(`/games/${gameId}`);
    return updatedGame;
}

