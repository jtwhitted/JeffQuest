
'use server';

import type { Player, Game, Session, DashboardInsight } from './types';
import fs from 'fs/promises';
import path from 'path';

// Define paths to the JSON files
const dataDir = path.join(process.cwd(), 'src', 'data');
const PLAYERS_PATH = path.join(dataDir, 'players.json');
const GAMES_PATH = path.join(dataDir, 'games.json');
const SESSIONS_PATH = path.join(dataDir, 'sessions.json');
const DASHBOARD_PATH = path.join(dataDir, 'dashboard.json');


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
    const [players, games, sessions, dashboard] = await Promise.all([
        readData<Player>(PLAYERS_PATH),
        readData<Game>(GAMES_PATH),
        readData<Session>(SESSIONS_PATH),
        readData<DashboardInsight>(DASHBOARD_PATH),
    ]);
    return { players, games, sessions, dashboard };
}

// --- Data Mutation Functions ---

export async function addGameToDB(game: Game): Promise<Game> {
    const games = await readData<Game>(GAMES_PATH);
    
    const gameIndex = games.findIndex(g => g.bggId === game.bggId || g.id === game.id);

    if (gameIndex !== -1) {
        // Game exists, update it with the new data.
        const updatedGame = { ...games[gameIndex], ...game };
        games[gameIndex] = updatedGame;
        await writeData(GAMES_PATH, games);
        return updatedGame;
    }

    // If game does not exist, add it.
    games.push(game);
    await writeData(GAMES_PATH, games);
    return game;
}

export async function updateGameInDB(gameId: string, updatedData: Partial<Game>): Promise<Game> {
    const games = await readData<Game>(GAMES_PATH);
    const gameIndex = games.findIndex(g => g.id === gameId);
    if (gameIndex === -1) {
        throw new Error('Game not found');
    }
    const updatedGame = { ...games[gameIndex], ...updatedData };
    games[gameIndex] = updatedGame;
    await writeData(GAMES_PATH, games);
    return updatedGame;
}

export async function addSessionToDB(session: Session): Promise<Session> {
    const sessions = await readData<Session>(SESSIONS_PATH);
    // Prevent adding duplicate sessions from BGG import
    if (session.id.startsWith('s-bgg-') && sessions.find(s => s.id === session.id)) {
        return session;
    }
    sessions.push(session);
    await writeData(SESSIONS_PATH, sessions);
    return session;
}

export async function addPlayerToDB(player: Player): Promise<Player> {
    const players = await readData<Player>(PLAYERS_PATH);
    players.push(player);
    await writeData(PLAYERS_PATH, players);
    return player;
}

export async function updatePlayerInDB(playerId: string, updatedData: Partial<Player>): Promise<Player> {
    const players = await readData<Player>(PLAYERS_PATH);
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
        throw new Error('Player not found');
    }
    const updatedPlayer = { ...players[playerIndex], ...updatedData };
    players[playerIndex] = updatedPlayer;
    await writeData(PLAYERS_PATH, players);
    return updatedPlayer;
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

export async function deleteSessionFromDB(sessionId: string): Promise<void> {
    let sessions = await readData<Session>(SESSIONS_PATH);
    sessions = sessions.filter(s => s.id !== sessionId);
    await writeData(SESSIONS_PATH, sessions);
}

export async function deleteInsightFromDB(insightId: string): Promise<void> {
    let insights = await readData<DashboardInsight>(DASHBOARD_PATH);
    insights = insights.filter(i => i.id !== insightId);
    await writeData(DASHBOARD_PATH, insights);
}
