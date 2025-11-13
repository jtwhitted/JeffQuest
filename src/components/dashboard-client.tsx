
'use client';

import { useState } from 'react';
import type { Session, Player, Game } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GamesOverTimeChart } from '@/components/charts/games-over-time-chart';
import { WinLossChart } from '@/components/charts/win-loss-chart';
import { DataExporter } from './data-exporter';
import { Swords, Users, Dices, Crown, Medal, TrendingDown, ShieldCheck, ShieldX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { PlayerDetailsDialog, type PlayerWithFullStats } from './player-details-dialog';
import { useGames } from '@/context/game-context';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

interface DashboardClientProps {
  sessions: Session[];
  players: Player[];
  games: Game[];
}

export default function DashboardClient({ sessions, players, games }: DashboardClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithFullStats | null>(null);

  const totalSessions = sessions.length;
  const totalPlayers = players.length;
  
  const winsByPlayer = sessions.reduce((acc, session) => {
    if (session.winnerId) {
      acc[session.winnerId] = (acc[session.winnerId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topPlayerEntry = Object.entries(winsByPlayer).sort(([, a], [, b]) => b - a)[0];
  const topPlayer = topPlayerEntry ? players.find(p => p.id === topPlayerEntry[0]) : null;

  const playsByGame = sessions.reduce((acc, session) => {
    acc[session.gameId] = (acc[session.gameId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostPlayedGameEntry = Object.entries(playsByGame).sort(([, a], [, b]) => b - a)[0];
  const mostPlayedGame = mostPlayedGameEntry ? games.find(g => g.id === mostPlayedGameEntry[0]) : null;

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

  const playersWithStats = players
    .map(p => getFullPlayerStats(p))
    .filter(p => p && p.gamesPlayed > 0) as PlayerWithFullStats[];

  const topPlayerWithStats = playersWithStats.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)[0] || null;
  const bottomPlayerWithStats = playersWithStats.sort((a, b) => a.winRate - b.winRate || a.gamesPlayed - b.gamesPlayed)[0] || null;

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <>
      {selectedPlayer && (
        <PlayerDetailsDialog
          open={!!selectedPlayer}
          onOpenChange={() => setSelectedPlayer(null)}
          player={selectedPlayer}
        />
      )}
      <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <DataExporter data={{ sessions, players, games }} />
          </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
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
              <CardTitle className="text-sm font-medium">Total Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlayers}</div>
              <p className="text-xs text-muted-foreground">in your group</p>
            </CardContent>
          </Card>
          <Card
            className={mostPlayedGame ? 'cursor-pointer transition-shadow hover:shadow-lg' : ''}
           >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Played</CardTitle>
                <Medal className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
                {mostPlayedGame ? (
                <Link href={`/games/${mostPlayedGame.id}`} className="flex items-center gap-4 group">
                    <div className="relative">
                        <Image src={mostPlayedGame.imageUrl} alt={mostPlayedGame.name} width={48} height={48} className="rounded-md object-cover h-12 w-12" data-ai-hint={`${mostPlayedGame.name} boardgame`} unoptimized/>
                    </div>
                    <div>
                        <div className="text-xl font-bold group-hover:underline">{mostPlayedGame.name}</div>
                        <p className="text-xs text-muted-foreground">{mostPlayedGameEntry?.[1] || 0} plays</p>
                    </div>
                </Link>
                ) : (
                    <>
                        <div className="text-2xl font-bold">N/A</div>
                        <p className="text-xs text-muted-foreground">No games played yet</p>
                    </>
                )}
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
               {topPlayerWithStats ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={topPlayerWithStats.avatarUrl} alt={topPlayerWithStats.name} />
                      <AvatarFallback>{topPlayerWithStats.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Crown className="absolute -top-2 -right-2 h-5 w-5 text-amber-400 transform -rotate-12" />
                  </div>
                  <div>
                      <div className="text-xl font-bold">{topPlayerWithStats.name}</div>
                      <p className="text-xs text-muted-foreground">{topPlayerWithStats.winRate}% win rate</p>
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
           <Card
            className={bottomPlayerWithStats ? 'cursor-pointer transition-shadow hover:shadow-lg' : ''}
            onClick={() => bottomPlayerWithStats && setSelectedPlayer(bottomPlayerWithStats)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Biggest Loser</CardTitle>
               <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
               {bottomPlayerWithStats ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={bottomPlayerWithStats.avatarUrl} alt={bottomPlayerWithStats.name} />
                      <AvatarFallback>{bottomPlayerWithStats.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                      <div className="text-xl font-bold">{bottomPlayerWithStats.name}</div>
                      <p className="text-xs text-muted-foreground">{bottomPlayerWithStats.winRate}% win rate</p>
                  </div>
                </div>
              ) : (
                  <>
                      <div className="text-2xl font-bold">N/A</div>
                      <p className="text-xs text-muted-foreground">No players with losses yet</p>
                  </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Sessions Overview</CardTitle>
                <CardDescription>Number of games played per month.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <GamesOverTimeChart sessions={sessions} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Player Performance</CardTitle>
                <CardDescription>Win/loss ratio for each player.</CardDescription>
              </CardHeader>
              <CardContent>
                <WinLossChart sessions={sessions} players={players} />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                 <CardDescription>Your latest game plays.</CardDescription>
              </CardHeader>
              <CardContent>
                 {recentSessions.length > 0 ? (
                    <ul className="space-y-4">
                        {recentSessions.map(session => {
                            const game = games.find(g => g.id === session.gameId);
                            const sessionPlayers = players.filter(p => session.playerIds.includes(p.id));
                            const winner = players.find(p => p.id === session.winnerId);
                            if (!game) return null;
                            return (
                                <li key={session.id}>
                                    <Link href={`/sessions/${session.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                        <div className="flex items-start gap-4">
                                            <Image src={game.imageUrl} alt={game.name} width={64} height={64} className="rounded-md object-cover h-16 w-16" data-ai-hint={`${game.name} boardgame`} unoptimized />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold">{game.name}</h4>
                                                        <p className="text-sm text-muted-foreground">{format(new Date(session.date), 'MMMM d, yyyy')}</p>
                                                    </div>
                                                    <div className="flex -space-x-2 overflow-hidden">
                                                        {sessionPlayers.map((player) => (
                                                            <Avatar key={player.id} className="h-7 w-7 border-2 border-card">
                                                            <AvatarImage src={player.avatarUrl} alt={player.name} />
                                                            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    {session.cooperativeResult ? (
                                                        <div className={`flex items-center text-xs font-medium ${session.cooperativeResult === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {session.cooperativeResult === 'win' ? <ShieldCheck className="mr-1.5 h-4 w-4"/> : <ShieldX className="mr-1.5 h-4 w-4"/>}
                                                            Cooperative {session.cooperativeResult === 'win' ? 'Win' : 'Loss'}
                                                        </div>
                                                    ) : winner ? (
                                                        <div className="flex items-center text-xs font-medium text-amber-400">
                                                            <Crown className="mr-1.5 h-4 w-4" />
                                                            <span>{winner.name} won</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center text-xs font-medium text-muted-foreground">
                                                            <Users className="mr-1.5 h-4 w-4" />
                                                            <span>Game played</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No sessions logged yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
