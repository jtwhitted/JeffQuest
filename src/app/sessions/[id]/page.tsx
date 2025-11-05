import { getSessionById, getGameById, getPlayers } from '@/lib/actions';
import SessionDetailsClient from '@/components/session-details-client';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getSessionById(params.id);
  const game = session ? await getGameById(session.gameId) : null;
  
  if (!session || !game) {
    return {
      title: 'Session Not Found | Tabletop Tracker',
    };
  }

  return {
    title: `Session: ${game.name} | Tabletop Tracker`,
    description: `Details for your ${game.name} session on ${new Date(session.date).toLocaleDateString()}.`,
  };
}


export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionById(params.id);

  if (!session) {
    notFound();
  }

  const game = await getGameById(session.gameId);
  const allPlayers = await getPlayers();

  if (!game) {
    notFound();
  }

  const sessionPlayers = allPlayers.filter(p => session.playerIds.includes(p.id));
  const winner = allPlayers.find(p => p.id === session.winnerId);

  return (
    <div className="space-y-8">
       <PageHeader
        title={game.name}
        description={`Session played on ${new Date(session.date).toLocaleDateString()}`}
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
