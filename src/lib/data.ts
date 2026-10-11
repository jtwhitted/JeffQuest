
'use server';

import type { Player, Game, Session, DashboardInsight } from './types';
import { db } from './firebase-admin';

const playersCol = db.collection('players');
const gamesCol = db.collection('games');
const sessionsCol = db.collection('sessions');
const dashboardCol = db.collection('dashboardInsights');

function withId<T>(doc: FirebaseFirestore.QueryDocumentSnapshot): T {
    return { ...doc.data(), id: doc.id } as T;
}

// --- Data Accessor ---
export async function getInitialData() {
    const [playersSnap, gamesSnap, sessionsSnap, dashboardSnap] = await Promise.all([
        playersCol.get(),
        gamesCol.get(),
        sessionsCol.get(),
        dashboardCol.get(),
    ]);
    return {
        players: playersSnap.docs.map(d => withId<Player>(d)),
        games: gamesSnap.docs.map(d => withId<Game>(d)),
        sessions: sessionsSnap.docs.map(d => withId<Session>(d)),
        dashboard: dashboardSnap.docs.map(d => withId<DashboardInsight>(d)),
    };
}

// --- Data Mutation Functions ---

export async function addGameToDB(game: Game): Promise<Game> {
    let existingDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    if (game.bggId) {
        const byBggId = await gamesCol.where('bggId', '==', game.bggId).limit(1).get();
        existingDoc = byBggId.docs[0];
        if (!existingDoc) {
            const byIdMatchingBggId = await gamesCol.doc(game.bggId).get();
            if (byIdMatchingBggId.exists) {
                existingDoc = byIdMatchingBggId as unknown as FirebaseFirestore.QueryDocumentSnapshot;
            }
        }
    }

    if (existingDoc) {
        const { id: _ignoredId, ...gameData } = game;
        const updatedGame = { ...existingDoc.data(), ...gameData, id: existingDoc.id } as Game;
        await gamesCol.doc(existingDoc.id).set(gameData, { merge: true });
        return updatedGame;
    }

    const { id, ...gameData } = game;
    await gamesCol.doc(id).set(gameData);
    return game;
}

export async function updateGameInDB(gameId: string, updatedData: Partial<Game>): Promise<Game> {
    const docRef = gamesCol.doc(gameId);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new Error('Game not found');
    }
    const { id: _ignoredId, ...patch } = updatedData;
    await docRef.set(patch, { merge: true });
    return { ...doc.data(), ...patch, id: gameId } as Game;
}

export async function addSessionToDB(session: Session): Promise<Session> {
    const docRef = sessionsCol.doc(session.id);
    // Prevent adding duplicate sessions from BGG import
    if (session.id.startsWith('s-bgg-')) {
        const existing = await docRef.get();
        if (existing.exists) {
            return session;
        }
    }
    const { id, ...sessionData } = session;
    await docRef.set(sessionData);
    return session;
}

export async function addPlayerToDB(player: Player): Promise<Player> {
    const { id, ...playerData } = player;
    await playersCol.doc(id).set(playerData);
    return player;
}

export async function updatePlayerInDB(playerId: string, updatedData: Partial<Player>): Promise<Player> {
    const docRef = playersCol.doc(playerId);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new Error('Player not found');
    }
    const { id: _ignoredId, ...patch } = updatedData;
    await docRef.set(patch, { merge: true });
    return { ...doc.data(), ...patch, id: playerId } as Player;
}

export async function deleteGameFromDB(gameId: string): Promise<void> {
    await gamesCol.doc(gameId).delete();

    // Also delete associated sessions
    const orphanedSessions = await sessionsCol.where('gameId', '==', gameId).get();
    const batch = db.batch();
    orphanedSessions.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

export async function deletePlayerFromDB(playerId: string): Promise<void> {
    await playersCol.doc(playerId).delete();

    // Also update sessions that included this player
    const affectedSessions = await sessionsCol.where('playerIds', 'array-contains', playerId).get();
    const batch = db.batch();
    affectedSessions.docs.forEach(d => {
        const session = d.data() as Session;
        const newPlayerIds = session.playerIds.filter(id => id !== playerId);
        const winnerId = session.winnerId === playerId ? undefined : session.winnerId;
        batch.set(d.ref, { playerIds: newPlayerIds, winnerId }, { merge: true });
    });
    await batch.commit();
}

export async function deleteSessionFromDB(sessionId: string): Promise<void> {
    await sessionsCol.doc(sessionId).delete();
}

export async function addInsightToDB(insight: DashboardInsight): Promise<DashboardInsight> {
    const { id, ...insightData } = insight;
    await dashboardCol.doc(id).set(insightData);
    return insight;
}

export async function updateInsightInDB(insightId: string, updatedData: Partial<DashboardInsight>): Promise<DashboardInsight> {
    const docRef = dashboardCol.doc(insightId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error('Insight not found.');
    }

    const { id: _ignoredId, ...patch } = updatedData;
    await docRef.set(patch, { merge: true });
    return { ...doc.data(), ...patch, id: insightId } as DashboardInsight;
}

export async function deleteInsightFromDB(insightId: string): Promise<void> {
    await dashboardCol.doc(insightId).delete();
}
