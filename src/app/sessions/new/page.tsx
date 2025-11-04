import PageHeader from '@/components/page-header';
import GameLogForm from '@/components/game-log-form';
import { getGames, getPlayers } from '@/lib/data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'New Session | Tabletop Tracker',
    description: 'Log a new board game session.',
};

export default async function NewSessionPage() {
    const games = await getGames();
    const players = await getPlayers();

    return (
        <div className="space-y-8">
            <PageHeader
                title="Log a New Session"
                description="Record the details of your latest game."
            >
                <Button asChild variant="outline">
                  <Link href="/sessions">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Link>
                </Button>
            </PageHeader>
            <div className="mx-auto max-w-2xl">
                <GameLogForm games={games} players={players} />
            </div>
        </div>
    );
}
