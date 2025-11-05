import { getSessions, getGames, getPlayers } from '@/lib/actions';
import SessionCard from '@/components/session-card';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sessions | Tabletop Tracker',
  description: 'Browse all your logged game sessions.',
};

export default async function SessionsPage() {
  const sessions = await getSessions();
  const games = await getGames();
  const players = await getPlayers();

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <PageHeader
        title="Game Sessions"
        description="A log of all your recorded plays."
      >
        <Button asChild>
          <Link href="/sessions/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Log New Session
          </Link>
        </Button>
      </PageHeader>
      
      {sortedSessions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedSessions.map((session) => {
            const game = games.find((g) => g.id === session.gameId);
            const sessionPlayers = players.filter((p) => session.playerIds.includes(p.id));
            const winner = players.find(p => p.id === session.winnerId);
            
            if (!game) return null;

            return (
              <SessionCard
                key={session.id}
                session={session}
                game={game}
                players={sessionPlayers}
                winner={winner}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <h3 className="text-lg font-semibold">No sessions logged yet.</h3>
          <p>Start by logging your first game session!</p>
        </div>
      )}
    </div>
  );
}
