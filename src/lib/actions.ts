
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Game, Player, Session, RulebookDocument, YoutubeVideo, DashboardInsight } from './types';
import { 
    addGameToDB,
    addSessionToDB,
    addPlayerToDB,
    deleteGameFromDB,
    deletePlayerFromDB,
    deleteSessionFromDB,
    updatePlayerInDB,
    getInitialData,
    updateGameInDB,
    deleteInsightFromDB
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
    description: z.string().optional(),
    yearPublished: z.number().optional(),
    minPlayers: z.number().min(1, 'Must have at least 1 player'),
    maxPlayers: z.number().min(1, 'Must have at least 1 player'),
    minPlaytime: z.number().optional(),
    maxPlaytime: z.number().optional(),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
    category: z.array(z.string()).optional(),
    mechanics: z.array(z.string()).optional(),
    designers: z.array(z.string()).optional(),
    publishers: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
    rating: z.number().optional(),
    ratingCount: z.number().optional(),
    complexity: z.number().optional(),
    bggComments: z.array(z.object({ username: z.string(), comment: z.string() })).optional(),
});

export async function addGame(gameData: z.infer<typeof gameFormSchema>): Promise<Game> {
    const validatedFields = gameFormSchema.safeParse(gameData);

    if (!validatedFields.success) {
        console.error('Validation failed:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid game data.');
    }

    const newGame: Game = {
        id: `g${Date.now()}`,
        ...validatedFields.data,
    } as Game;
    
    const addedOrUpdatedGame = await addGameToDB(newGame);
    revalidatePath('/games');
    revalidatePath('/sessions/new');
    return addedOrUpdatedGame;
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

export async function deleteInsightAction(insightId: string) {
    await deleteInsightFromDB(insightId);
    revalidatePath('/');
}


export async function searchBggAction(query: string): Promise<Partial<Game>[]> {
  if (!query) {
    return [];
  }
  try {
    const searchResults = await searchBgg(query, false);
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
  if (!ids || ids.length === 0) return [];
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
    
    const initialData = await getInitialData();
    let games = initialData.games;
    const players = initialData.players;
    const currentSessions = initialData.sessions;

    const bggPlays = await getBggPlayHistory(username);
    const existingSessionIds = new Set(currentSessions.map(s => s.id));

    let importedCount = 0;

    for (const play of bggPlays) {
        const bggSessionId = `s-bgg-${play.bggPlayId}`;
        if (existingSessionIds.has(bggSessionId)) {
            continue;
        }

        let game = games.find(g => g.bggId === play.bggGameId || g.id === play.bggGameId);
        
        if (!game) {
            try {
                const gameDetailsList = await getBggDetails([play.bggGameId], true);
                if (gameDetailsList.length > 0) {
                    const gameDetails = gameDetailsList[0];
                    const newGameData = {
                        name: gameDetails.name!,
                        bggId: play.bggGameId,
                        description: gameDetails.description,
                        yearPublished: gameDetails.yearPublished,
                        minPlayers: gameDetails.minPlayers || 1,
                        maxPlayers: gameDetails.maxPlayers || 1,
                        minPlaytime: gameDetails.minPlaytime,
                        maxPlaytime: gameDetails.maxPlaytime,
                        difficulty: gameDetails.difficulty,
                        category: Array.isArray(gameDetails.category) ? gameDetails.category : (gameDetails.category ? [gameDetails.category] : []),
                        mechanics: Array.isArray(gameDetails.mechanics) ? gameDetails.mechanics : (gameDetails.mechanics ? [gameDetails.mechanics] : []),
                        designers: Array.isArray(gameDetails.designers) ? gameDetails.designers : (gameDetails.designers ? [gameDetails.designers] : []),
                        publishers: Array.isArray(gameDetails.publishers) ? gameDetails.publishers : (gameDetails.publishers ? [gameDetails.publishers] : []),
                        imageUrl: gameDetails.imageUrl,
                    };
                    game = await addGame(newGameData);
                    games.push(game);
                } else {
                    continue;
                }
            } catch (error) {
                console.error(`Error adding game with BGG ID ${play.bggGameId}: ${error}`);
                throw error;
            }
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
            continue;
        }

        const isCooperative = game.mechanics?.includes('Cooperative Game') || false;
        let cooperativeResult: 'win' | 'loss' | undefined = undefined;

        if (isCooperative) {
            cooperativeResult = play.players.some(p => p.win) ? 'win' : 'loss';
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
    }
    
    revalidatePath('/sessions');
    revalidatePath('/');

    return { importedCount };
}

export async function importBggCollectionAction(username: string): Promise<{ importedCount: number }> {
    if (!username) {
        throw new Error('BGG username is required.');
    }

    const bggCollection = await getBggCollection(username);
    const { games: currentGames } = await getInitialData();
    const currentBggIds = new Set(currentGames.map(g => g.bggId).filter(Boolean));

    const newGamesFromBgg = bggCollection.filter(item => !currentBggIds.has(item.bggId));
    
    if (newGamesFromBgg.length === 0) {
        return { importedCount: 0 };
    }

    let successfulImports = 0;
    for (const item of newGamesFromBgg) {
        try {
            const gameDetailsList = await getBggDetails([item.bggId], true);
            
            if (gameDetailsList.length > 0 && gameDetailsList[0].name) {
                const gameDetails = gameDetailsList[0];
                const newGameData = {
                    name: gameDetails.name!,
                    bggId: item.bggId,
                    description: gameDetails.description,
                    yearPublished: gameDetails.yearPublished,
                    minPlayers: gameDetails.minPlayers || 1,
                    maxPlayers: gameDetails.maxPlayers || 1,
                    minPlaytime: gameDetails.minPlaytime,
                    maxPlaytime: gameDetails.maxPlaytime,
                    difficulty: gameDetails.difficulty,
                    category: Array.isArray(gameDetails.category) ? gameDetails.category : (gameDetails.category ? [gameDetails.category] : []),
                    mechanics: Array.isArray(gameDetails.mechanics) ? gameDetails.mechanics : (gameDetails.mechanics ? [gameDetails.mechanics] : []),
                    designers: Array.isArray(gameDetails.designers) ? gameDetails.designers : (gameDetails.designers ? [gameDetails.designers] : []),
                    publishers: Array.isArray(gameDetails.publishers) ? gameDetails.publishers : (gameDetails.publishers ? [gameDetails.publishers] : []),
                    imageUrl: gameDetails.imageUrl,
                    rating: gameDetails.rating,
                    ratingCount: gameDetails.ratingCount,
                    complexity: gameDetails.complexity,
                    bggComments: gameDetails.bggComments,
                };
                
                await addGame(newGameData);
                successfulImports++;
            }
        } catch (error) {
             console.error(`Error importing game with BGG ID ${item.bggId}:`, error);
             if (error instanceof Error) {
                 throw new Error(`Failed on game ${item.bggId}: ${error.message}`);
             }
             throw error;
        }
    }
    
    if (successfulImports > 0) {
        revalidatePath('/games');
        revalidatePath('/sessions/new');
    }
    
    return { importedCount: successfulImports };
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
        const { games, players } = await getInitialData();
        const bggUser = players.find(p => p.id === playerId);
        const bggUsername = bggUser?.bggUsername;

        let updatedCount = 0;

        for (const bggItem of bggCollection) {
            
            const localGame = games.find(g => g.bggId === bggItem.bggId);
            
            if (!localGame) {
                continue;
            }
            
            let gameWasUpdated = false;
            const updates: Partial<Game> = {};

            // Update user's personal rating
            if (bggItem.userRating !== undefined) {
                const localRating = localGame.userRatings?.[playerId];
                if (localRating === undefined || localRating !== bggItem.userRating) {
                    updates.userRatings = {
                        ...(localGame.userRatings || {}),
                        [playerId]: bggItem.userRating,
                    };
                    gameWasUpdated = true;
                }
            }
            
            // Add user's comment to the game's bggComments
            if (bggItem.userComment && bggUsername) {
                const existingComments = localGame.bggComments || [];
                const userCommentExists = existingComments.some(c => c.username === bggUsername);

                if (!userCommentExists) {
                    updates.bggComments = [
                        ...existingComments,
                        { username: bggUsername, comment: bggItem.userComment }
                    ];
                    gameWasUpdated = true;
                }
            }


            if (gameWasUpdated) {
                await updateGameInDB(localGame.id, updates);
                updatedCount++;
            }
        }
        
        if (updatedCount > 0) {
            revalidatePath('/games');
            revalidatePath('/players');
        }

        return { updatedCount };

    } catch (error: any) {
        console.error('BGG ratings/comments import failed:', error);
        throw new Error(error.message || 'Failed to import ratings/comments from BGG.');
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
