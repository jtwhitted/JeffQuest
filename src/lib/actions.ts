
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player, Session, RulebookDocument, YoutubeVideo } from './types';
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
import { searchBgg, getBggDetails, getBggCollection, getBggPlayHistory, BggPlay, getBggFriends, getBggUserDetails } from './bgg';
import pdf from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

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


export interface BggPlay {
    bggPlayId: string;
    bggGameId: string;
    date: string;
    notes?: string;
    duration?: number;
    players: {
        name: string;
        bggUsername?: string;
        win: boolean;
        score?: number;
    }[];
}

export async function importBggPlayHistory(username: string): Promise<{ importedCount: number }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }

    const logLines: string[] = [];
    const log = (message: string) => {
        console.log(message);
        logLines.push(message);
    };

    log(`[BGG Import] Starting play history import for user: ${username}`);

    try {
        const initialData = await getInitialData();
        const games = initialData.games;
        const players = initialData.players;
        const currentSessions = initialData.sessions;

        const bggPlays = await getBggPlayHistory(username);
        const existingSessionIds = new Set(currentSessions.map(s => s.id));
        const newGamesAddedThisSession: Game[] = [];

        log(`[BGG Import] Fetched ${bggPlays.length} plays from BGG.`);
        log(`[BGG Import] Found ${currentSessions.length} existing sessions in the database.`);

        let importedCount = 0;

        for (const play of bggPlays) {
            log(`\n[BGG Import] Processing BGG Play ID: ${play.bggPlayId} for BGG Game ID: ${play.bggGameId}`);

            const bggSessionId = `s-bgg-${play.bggPlayId}`;
            if (existingSessionIds.has(bggSessionId)) {
                log(`[BGG Import] -> Skipping: Session ID ${bggSessionId} already exists.`);
                continue;
            }

            // Robust check against existing games and games added in this session.
            let game = games.find(g => String(g.bggId) === String(play.bggGameId)) || newGamesAddedThisSession.find(g => String(g.bggId) === String(play.bggGameId));

            if (!game) {
                 log(`[BGG Import] -> Game with BGG ID ${play.bggGameId} not found in local collection. Attempting to fetch from BGG.`);
                const gameDetails = await getBggDetails([play.bggGameId], true);
                if (gameDetails.length > 0) {
                    const newGameData = gameDetails[0];
                    const newGame: Game = {
                        id: `g-${play.bggGameId}`,
                        ...newGameData,
                        name: newGameData.name || 'Unknown Name',
                        category: newGameData.category || [],
                        imageUrl: newGameData.imageUrl || '',
                        minPlayers: newGameData.minPlayers || 1,
                        maxPlayers: newGameData.maxPlayers || 1,
                        difficulty: newGameData.difficulty || 'Intermediate',
                        bggId: play.bggGameId,
                    };
                    game = await addGameToDB(newGame);
                    newGamesAddedThisSession.push(game);
                    log(`[BGG Import] -> Successfully fetched and added new game: ${game.name}`);
                } else {
                    log(`[BGG Import] -> Skipping: Could not fetch details for BGG Game ID ${play.bggGameId}.`);
                    continue;
                }
            } else {
                 log(`[BGG Import] -> Found matching local game: ${game.name} (ID: ${game.id})`);
            }

            const playerIds: string[] = [];
            const scores: { playerId: string; score?: number }[] = [];
            let winnerId: string | undefined;

            for (const playPlayer of play.players) {
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
            
            if (playerIds.length === 0) {
                log(`[BGG Import] -> Skipping: Could not match any players for this play.`);
                continue;
            }

            const isCooperative = game.mechanics?.includes('Cooperative Game') || false;
            let cooperativeResult: 'win' | 'loss' | undefined = undefined;

            if (isCooperative) {
                if (play.players.some(p => p.win)) {
                    cooperativeResult = 'win';
                } else {
                    cooperativeResult = 'loss';
                }
                winnerId = undefined;
            }

            const newSession: Session = {
                id: bggSessionId,
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
            log(`[BGG Import] -> SUCCESS: Imported session for ${game.name}.`);
        }
        
        log(`\n[BGG Import] Finished. Total imported: ${importedCount}`);
        const logFilePath = path.join(process.cwd(), 'bgg-import-log.txt');
        await fs.writeFile(logFilePath, logLines.join('\n'), 'utf-8');
        log(`[BGG Import] Log file written to: ${logFilePath}`);
        
        revalidatePath('/sessions');
        revalidatePath('/');

        return { importedCount };
    } catch (error: any) {
        log(`[BGG Import] CRITICAL ERROR: ${error.message}`);
        const logFilePath = path.join(process.cwd(), 'bgg-import-log.txt');
        await fs.writeFile(logFilePath, logLines.join('\n'), 'utf-8');
        log(`[BGG Import] Log file written to: ${logFilePath}`);
        throw new Error(error.message || 'Failed to import play history from BGG.');
    }
}

export async function importBggCollectionAction(username: string): Promise<{ importedCount: number }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }

    try {
        const bggCollection = await getBggCollection(username);
        const { games: currentGames } = await getInitialData();
        const currentBggIds = new Set(currentGames.map(g => g.bggId).filter(Boolean));

        const newGamesFromBgg = bggCollection.filter(item => !currentBggIds.has(item.bggId));
        if (newGamesFromBgg.length === 0) {
            return { importedCount: 0 };
        }

        const newGameIds = newGamesFromBgg.map(item => item.bggId);
        const newGameDetails = await getBggDetails(newGameIds, true);

        for (const gameDetail of newGameDetails) {
            if (gameDetail.name && gameDetail.id) {
                await addGame({ name: gameDetail.name, bggId: gameDetail.id });
            }
        }
        
        revalidatePath('/games');
        revalidatePath('/sessions/new');

        return { importedCount: newGameDetails.length };
    } catch (error: any) {
        console.error('BGG Collection import failed:', error);
        throw new Error(error.message || 'Failed to import collection from BGG.');
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

export async function searchYoutubeAction(query: string): Promise<YoutubeVideo[]> {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
        console.error('YOUTUBE_API_KEY environment variable not set.');
        // Return an empty array if the key is missing
        return [];
    }
    
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('q', `How to play ${query}`);
    url.searchParams.append('type', 'video');
    url.searchParams.append('maxResults', '5');
    url.searchParams.append('key', YOUTUBE_API_KEY);

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorData = await response.json();
            console.error('YouTube API Error:', errorData);
            throw new Error('Failed to fetch videos from YouTube.');
        }

        const data = await response.json();
        
        if (!data.items) {
            return [];
        }

        const videos: YoutubeVideo[] = data.items.map((item: any) => ({
            id: `watch?v=${item.id.videoId}`,
            title: item.snippet.title.replace(/&amp;/g, '&'),
            thumbnail: item.snippet.thumbnails.high.url,
            channel: item.snippet.channelTitle,
        }));
        
        return videos.slice(0, 3);

    } catch (error) {
        console.error('Error fetching from YouTube:', error);
        return [];
    }
}

export async function setFavoriteVideoAction(gameId: string, videoId: string | undefined): Promise<Game> {
    const updatedGame = await updateGameInDB(gameId, { favoriteVideoId: videoId });
    revalidatePath(`/games/${gameId}`);
    return updatedGame;
}


export async function importBggFriendsAction(username: string): Promise<{ importedCount: number; friendsFound: number; friendsUsernames: string[] }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }

    const { players: currentPlayers } = await getInitialData();
    const friendsUsernames = await getBggFriends(username);
    const friendsFound = Array.isArray(friendsUsernames) ? friendsUsernames.length : 0;
    
    if (friendsFound === 0) {
        return { importedCount: 0, friendsFound: 0, friendsUsernames: [] };
    }
    
    const currentPlayerUsernames = new Set(
        currentPlayers.map(p => p.bggUsername?.toLowerCase()).filter(Boolean)
    );
     const currentPlayerNames = new Set(
        currentPlayers.map(p => p.name.toLowerCase())
    );

    const newFriendsUsernames = friendsUsernames.filter(friendUsername => {
        const lowercasedUsername = friendUsername.toLowerCase();
        return !currentPlayerUsernames.has(lowercasedUsername) && !currentPlayerNames.has(lowercasedUsername);
    });
    
    let importedCount = 0;
    if (newFriendsUsernames.length > 0) {
        for (const friendUsername of newFriendsUsernames) {
            try {
                const userDetails = await getBggUserDetails(friendUsername);
                await addPlayer({
                    name: userDetails.name,
                    avatarUrl: userDetails.avatarUrl,
                    bggUsername: friendUsername,
                });
                importedCount++;
            } catch (error) {
                console.error(`Failed to import friend ${friendUsername}:`, error);
            }
        }
    }
    
    if (importedCount > 0) {
        revalidatePath('/players');
    }
    
    return { importedCount, friendsFound, friendsUsernames };
}

    



    

    
