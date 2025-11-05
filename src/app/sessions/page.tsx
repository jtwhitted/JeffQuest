
'use client';
import SessionCard from '@/components/session-card';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useGames } from '@/context/game-context';

export default function SessionsPage() {
  const { sessions, games, players, isLoading } = useGames();

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
      
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedSessions.length > 0 ? (
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
