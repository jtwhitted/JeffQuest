
'use client';

import { useState } from 'react';
import type { Session, Player, Game } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GamesOverTimeChart } from '@/components/charts/games-over-time-chart';
import { WinLossChart } from '@/components/charts/win-loss-chart';
import { DataExporter } from './data-exporter';
import { Swords, Users, Dices, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PlayerDetailsDialog, type PlayerWithFullStats } from './player-details-dialog';
import { useGames } from '@/context/game-context';

interface DashboardClientProps {
  sessions: Session[];
  players: Player[];
  games: Game[];
}

export default function DashboardClient({ sessions, players, games }: DashboardClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithFullStats | null>(null);

  const totalSessions = sessions.length;
  const totalPlayers = players.length;
  const totalGames = games.length;
  
  const winsByPlayer = sessions.reduce((acc, session) => {
    if (session.winnerId) {
      acc[session.winnerId] = (acc[session.winnerId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topPlayerEntry = Object.entries(winsByPlayer).sort(([, a], [, b]) => b - a)[0];
  const topPlayer = topPlayerEntry ? players.find(p => p.id === topPlayerEntry[0]) : null;

  const getFullPlayerStats = (player: Player | null): PlayerWithFullStats | null => {
    if (!player) return null;
  
    const playerSessions = sessions.filter(s => s.playerIds.includes(player.id));
    const gamesPlayed = playerSessions.length;
    const wins = sessions.filter(s => s.winnerId === player.id || (s.cooperativeResult === 'win' && s.playerIds.includes(player.id))).length;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  
    const playsByGame = playerSessions.reduce((acc, session) => {
      acc[session.gameId] = (acc[session.gameId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
    const favoriteGameId = Object.entries(playsByGame).sort(([,a],[,b]) => b - a)[0]?.[0];
    const favoriteGame = games.find(g => g.id === favoriteGameId);
  
    const gameHistory = Object.keys(playsByGame)
      .map(gameId => {
        const game = games.find(g => g.id === gameId);
        if (!game) return null;
  
        const gameSessions = playerSessions
          .filter(s => s.gameId === gameId)
          .map(session => ({
            ...session,
            players: session.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[],
            winner: players.find(p => p.id === session.winnerId),
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
        return {
          game,
          sessions: gameSessions,
        };
      })
      .filter(Boolean) as PlayerWithFullStats['gameHistory'];
  
    return {
      ...player,
      gamesPlayed,
      wins,
      winRate,
      favoriteGame,
      gameHistory,
    };
  };

  const topPlayerWithStats = getFullPlayerStats(topPlayer);

  return (
    <>
      {topPlayerWithStats && (
        <PlayerDetailsDialog
          open={!!selectedPlayer}
          onOpenChange={() => setSelectedPlayer(null)}
          player={topPlayerWithStats}
        />
      )}
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
          <Card
            className={topPlayerWithStats ? 'cursor-pointer transition-shadow hover:shadow-lg' : ''}
            onClick={() => topPlayerWithStats && setSelectedPlayer(topPlayerWithStats)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Player</CardTitle>
               <Crown className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
               {topPlayer ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={topPlayer.avatarUrl} alt={topPlayer.name} />
                      <AvatarFallback>{topPlayer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Crown className="absolute -top-2 -right-2 h-5 w-5 text-amber-400 transform -rotate-12" />
                  </div>
                  <div>
                      <div className="text-xl font-bold">{topPlayer.name}</div>
                      <p className="text-xs text-muted-foreground">{winsByPlayer[topPlayer.id] || 0} wins</p>
                  </div>
                </div>
              ) : (
                  <>
                      <div className="text-2xl font-bold">N/A</div>
                      <p className="text-xs text-muted-foreground">No wins recorded yet</p>
                  </>
              )}
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
    </>
  );
}
