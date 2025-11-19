
'use client';
import SessionDetailsClient from '@/components/session-details-client';
import { useParams, notFound } from 'next/navigation';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useGames } from '@/context/game-context';
import { format, parseISO } from 'date-fns';

export default function SessionDetailPage() {
  const { id } = useParams();
  const { games, sessions, players, isLoading } = useGames();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const session = sessions.find(s => s.id === id);

  if (!session) {
    notFound();
  }

  const game = games.find(g => g.id === session.gameId);

  if (!game) {
    // This could happen if game data is inconsistent
    notFound();
  }

  const sessionPlayers = players.filter(p => session.playerIds.includes(p.id));
  const winner = players.find(p => p.id === session.winnerId);

  return (
    <div className="space-y-8">
       <PageHeader
        title={game.name}
        description={`Session played on ${format(parseISO(session.date), 'MMMM d, yyyy')}`}
      >
        <Button asChild variant="outline">
          <Link href="/sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Link>
        </Button>
      </PageHeader>
      <SessionDetailsClient session={session} game={game} players={sessionPlayers} winner={winner} />
    </div>
  );
}
