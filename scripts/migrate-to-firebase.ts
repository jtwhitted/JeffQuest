import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load env vars before firebase-admin reads them.
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '../src/lib/firebase-admin';

const dataDir = path.join(process.cwd(), 'src', 'data');

async function readJson<T>(fileName: string): Promise<T[]> {
    const filePath = path.join(dataDir, fileName);
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw) as T[];
    } catch (error: any) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function seedCollection(collectionName: string, records: { id: string;[key: string]: unknown }[]) {
    if (records.length === 0) {
        console.log(`  ${collectionName}: nothing to migrate`);
        return;
    }
    const batch = db.batch();
    for (const record of records) {
        const { id, ...data } = record;
        batch.set(db.collection(collectionName).doc(id), data);
    }
    await batch.commit();
    console.log(`  ${collectionName}: migrated ${records.length} document(s)`);
}

async function main() {
    console.log(`Migrating local JSON data to Firestore project "${process.env.FIREBASE_PROJECT_ID || 'studio-645902535-c7b43'}"...`);

    const [players, games, sessions, dashboard] = await Promise.all([
        readJson<{ id: string }>('players.json'),
        readJson<{ id: string }>('games.json'),
        readJson<{ id: string }>('sessions.json'),
        readJson<{ id: string }>('dashboard.json'),
    ]);

    await seedCollection('players', players);
    await seedCollection('games', games);
    await seedCollection('sessions', sessions);
    await seedCollection('dashboardInsights', dashboard);

    console.log('Done.');
    process.exit(0);
}

main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
