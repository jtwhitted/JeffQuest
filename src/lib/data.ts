
'use server';

import type { Player, Game, Session } from './types';
import fs from 'fs/promises';
import path from 'path';

// Define paths to the JSON files
const dataDir = path.join(process.cwd(), 'src', 'data');
const PLAYERS_PATH = path.join(dataDir, 'players.json');
const GAMES_PATH = path.join(dataDir, 'games.json');
const SESSIONS_PATH = path.join(dataDir, 'sessions.json');

// Helper function to read data from a JSON file
async function readData<T>(filePath: string): Promise<T[]> {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as T[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // If the file doesn't exist, return an empty array
            return [];
        }
        console.error(`Error reading data from ${filePath}:`, error);
        throw error;
    }
}

// Helper function to write data to a JSON file
async function writeData<T>(filePath: string, data: T[]): Promise<void> {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing data to ${filePath}:`, error);
        throw error;
    }
}


// --- Data Accessor ---
export async function getInitialData() {
    const [players, games, sessions] = await Promise.all([
        readData<Player>(PLAYERS_PATH),
        readData<Game>(GAMES_PATH),
        readData<Session>(SESSIONS_PATH)
    ]);
    return { players, games, sessions };
}

// --- Data Mutation Functions ---

export async function addGameToDB(game: Game): Promise<void> {
    const games = await readData<Game>(GAMES_PATH);
    const existingGame = games.find(g => g.name.toLowerCase() === game.name.toLowerCase());
    if (existingGame) {
        throw new Error(`A game named "${game.name}" already exists in your collection.`);
    }
    games.push(game);
    await writeData(GAMES_PATH, games);
}

export async function addSessionToDB(session: Session): Promise<Session> {
    const sessions = await readData<Session>(SESSIONS_PATH);
    sessions.push(session);
    await writeData(SESSIONS_PATH, sessions);
    return session;
}

export async function addPlayerToDB(player: Player): Promise<void> {
    const players = await readData<Player>(PLAYERS_PATH);
    players.push(player);
    await writeData(PLAYERS_PATH, players);
}

export async function deleteGameFromDB(gameId: string): Promise<void> {
    let games = await readData<Game>(GAMES_PATH);
    games = games.filter(g => g.id !== gameId);
    await writeData(GAMES_PATH, games);
    
    // Also delete associated sessions
    let sessions = await readData<Session>(SESSIONS_PATH);
    sessions = sessions.filter(s => s.gameId !== gameId);
    await writeData(SESSIONS_PATH, sessions);
}

export async function deletePlayerFromDB(playerId: string): Promise<void> {
    let players = await readData<Player>(PLAYERS_PATH);
    players = players.filter(p => p.id !== playerId);
    await writeData(PLAYERS_PATH, players);

    // Also update sessions
    let sessions = await readData<Session>(SESSIONS_PATH);
    sessions = sessions.map(s => {
        const newPlayerIds = s.playerIds.filter(id => id !== playerId);
        if (newPlayerIds.length < s.playerIds.length) {
            let winnerId = s.winnerId;
            if (winnerId === playerId) {
                winnerId = undefined;
            }
            return { ...s, playerIds: newPlayerIds, winnerId };
        }
        return s;
    });
    await writeData(SESSIONS_PATH, sessions);
}
