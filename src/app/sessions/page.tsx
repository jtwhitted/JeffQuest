
'use client';
import { useState } from 'react';
import SessionCard from '@/components/session-card';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useGames } from '@/context/game-context';
import type { Session } from '@/lib/types';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function SessionsPage() {
  const { sessions, games, players, isLoading, deleteSession } = useGames();
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const { toast } = useToast();

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteSession(sessionToDelete.id);
      const game = games.find(g => g.id === sessionToDelete.gameId);
      toast({
        title: 'Session Deleted',
        description: `The session for ${game?.name} on ${format(new Date(sessionToDelete.date), 'MM/dd/yyyy')} has been removed.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete session.',
      });
    } finally {
      setSessionToDelete(null);
    }
  };

  return (
    <>
    <DeleteConfirmationDialog
        open={!!sessionToDelete}
        onOpenChange={() => setSessionToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        description={`Are you sure you want to delete this session? This action cannot be undone.`}
      />
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
                onDelete={() => setSessionToDelete(session)}
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
    </>
  );
}
