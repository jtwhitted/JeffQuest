'use client';
import type { Session, Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown, ShieldCheck, ShieldX, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface GameSessionHistoryProps {
  sessions: Session[];
  allPlayers: Player[];
}

export function GameSessionHistory({ sessions, allPlayers }: GameSessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No sessions have been logged for this game yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game History</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {sessions.map(session => {
            const sessionPlayers = allPlayers.filter(p => session.playerIds.includes(p.id));
            const winner = allPlayers.find(p => p.id === session.winnerId);
            
            return (
              <li key={session.id}>
                <Link href={`/sessions/${session.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold">{format(parseISO(session.date), 'MMMM d, yyyy')}</p>
                        <div className="flex -space-x-2 overflow-hidden mt-2 sm:mt-0">
                            {sessionPlayers.map((player) => (
                                <Avatar key={player.id} className="h-8 w-8 border-2 border-card">
                                <AvatarImage src={player.avatarUrl} alt={player.name} />
                                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3">
                        {session.cooperativeResult ? (
                            <div className={`flex items-center text-sm font-medium ${session.cooperativeResult === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                {session.cooperativeResult === 'win' ? <ShieldCheck className="mr-2"/> : <ShieldX className="mr-2"/>}
                                Cooperative {session.cooperativeResult === 'win' ? 'Win' : 'Loss'}
                            </div>
                        ) : winner ? (
                            <div className="flex items-center text-sm font-medium text-amber-400">
                                <Crown className="mr-2" />
                                <span>{winner.name} won</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-sm font-medium text-muted-foreground">
                                <Users className="mr-2" />
                                <span>Game played, no winner recorded.</span>
                            </div>
                        )}
                    </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
