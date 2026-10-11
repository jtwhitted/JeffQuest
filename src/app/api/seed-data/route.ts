import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import playersData from '@/data/players.json';
import gamesData from '@/data/games.json';
import sessionsData from '@/data/sessions.json';
import dashboardData from '@/data/dashboard.json';

type SeedRecord = { id: string; [key: string]: unknown };

const collections: { name: string; records: SeedRecord[] }[] = [
    { name: 'players', records: playersData as SeedRecord[] },
    { name: 'games', records: gamesData as SeedRecord[] },
    { name: 'sessions', records: sessionsData as SeedRecord[] },
    { name: 'dashboardInsights', records: dashboardData as SeedRecord[] },
];

export async function GET() {
    const migrated: Record<string, number> = {};

    for (const { name, records } of collections) {
        if (records.length === 0) {
            migrated[name] = 0;
            continue;
        }
        const batch = db.batch();
        for (const record of records) {
            const { id, ...data } = record;
            batch.set(db.collection(name).doc(id), data);
        }
        await batch.commit();
        migrated[name] = records.length;
    }

    return NextResponse.json({ ok: true, migrated });
}
