'use client';

import type { Session, Player, Game } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GamesOverTimeChart } from '@/components/charts/games-over-time-chart';
import { WinLossChart } from '@/components/charts/win-loss-chart';
import { DataExporter } from './data-exporter';
import { Swords, Users, Dices, Crown } from 'lucide-react';

interface DashboardClientProps {
  sessions: Session[];
  players: Player[];
  games: Game[];
}

export default function DashboardClient({ sessions, players, games }: DashboardClientProps) {
  const totalSessions = sessions.length;
  const totalPlayers = players.length;
  const totalGames = games.length;
  
  const winsByPlayer = sessions.reduce((acc, session) => {
    acc[session.winnerId] = (acc[session.winnerId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topPlayerEntry = Object.entries(winsByPlayer).sort(([, a], [, b]) => b - a)[0];
  const topPlayer = topPlayerEntry ? players.find(p => p.id === topPlayerEntry[0]) : null;

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <DataExporter data={{ sessions, players, games }} />
        </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">games played</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Games</CardTitle>
            <Dices className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
            <p className="text-xs text-muted-foreground">different games logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlayers}</div>
            <p className="text-xs text-muted-foreground">in your group</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Player</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPlayer?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Most wins</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Sessions Overview</CardTitle>
            <CardDescription>Number of games played per month.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <GamesOverTimeChart sessions={sessions} />
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Player Performance</CardTitle>
             <CardDescription>Win/loss ratio for each player.</CardDescription>
          </CardHeader>
          <CardContent>
            <WinLossChart sessions={sessions} players={players} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
