'use client';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { Crown, Swords, PlusCircle, Users, BarChart3, Loader2, Dices, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Game } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddGameDialog } from '@/components/add-game-dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useGames } from '@/context/game-context';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

export default function GamesPage() {
  const { games, sessions, players, isLoading: areGamesLoading, deleteGame } = useGames();
  const [isAddGameOpen, setAddGameOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const { toast } = useToast();

  const gamesWithStats = games.map(game => {
    const gameSessions = sessions.filter(s => s.gameId === game.id);
    const playCount = gameSessions.length;
    
    const winsByPlayer = gameSessions.reduce((acc, session) => {
      const winner = players.find(p => p.id === session.winnerId);
      if (winner) {
        acc[winner.name] = (acc[winner.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const playerRankings = Object.entries(winsByPlayer)
        .map(([name, wins]) => ({ name, wins }))
        .sort((a, b) => b.wins - a.wins);

    return {
      ...game,
      playCount,
      playerRankings
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleDelete = async () => {
    if (!gameToDelete) return;
    try {
      await deleteGame(gameToDelete.id);
      toast({
        title: 'Game Deleted',
        description: `${gameToDelete.name} has been removed from your collection.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete game.',
      });
    } finally {
      setGameToDelete(null);
    }
  };


  return (
    <>
    <AddGameDialog open={isAddGameOpen} onOpenChange={setAddGameOpen} />
    <DeleteConfirmationDialog
        open={!!gameToDelete}
        onOpenChange={() => setGameToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Game"
        description={`Are you sure you want to delete ${gameToDelete?.name}? All associated session data will also be removed.`}
      />
    <div className="space-y-8">
      <PageHeader
        title="Game Library"
        description="An overview of every game in your collection."
      >
        <Button onClick={() => setAddGameOpen(true)}>
          <PlusCircle className="mr-2" />
          Add New Game
        </Button>
      </PageHeader>

      {areGamesLoading ? (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : gamesWithStats.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {gamesWithStats.map(game => (
              <Card key={game.id} className="group/card flex flex-col w-full transition-shadow hover:shadow-lg">
                <div className='relative'>
                    <Link href={`/games/${game.id}`} className="flex">
                        <CardHeader className="relative flex flex-row items-start gap-4 flex-1">
                        {game.imageUrl ? (
                            <Image src={game.imageUrl} alt={game.name} width={80} height={80} className="rounded-lg object-cover" data-ai-hint={`${game.category} boardgame`} unoptimized />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted">
                                <Dices className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1">
                            <CardTitle>{game.name}</CardTitle>
                            <CardDescription>{game.category}</CardDescription>
                            <div className="mt-2 flex flex-col items-start gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <Swords className="mr-1.5 h-4 w-4" />
                                    <span>{game.playCount} {game.playCount === 1 ? 'play' : 'plays'}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <div className="flex items-center">
                                        <Users className="mr-1.5 h-4 w-4" />
                                        <span>{game.minPlayers}-{game.maxPlayers} players</span>
                                    </div>
                                    {game.difficulty && (
                                    <div className="flex items-center">
                                        <BarChart3 className="mr-1.5 h-4 w-4" />
                                        <span>{game.difficulty}</span>
                                    </div>
                                    )}
                                </div>
                                {game.mechanics && game.mechanics.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {game.mechanics.slice(0, 3).map(mechanic => (
                                    <Badge key={mechanic} variant="secondary" className="text-xs">
                                        {mechanic}
                                    </Badge>
                                    ))}
                                </div>
                                )}
                            </div>
                        </div>
                        </CardHeader>
                    </Link>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGameToDelete(game);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete game</span>
                      </Button>
                </div>
                <CardContent className="flex-1">
                  {game.playerRankings.length > 0 ? (
                      <div>
                          <h4 className="mb-2 font-semibold">Top Players</h4>
                          <ul className="space-y-2">
                          {game.playerRankings.slice(0, 3).map((rank, index) => {
                              const player = players.find(p => p.name === rank.name);
                              return (
                                  <li key={rank.name} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                          {index === 0 && <Crown className="h-4 w-4 text-amber-400" />}
                                          <Avatar className="h-6 w-6">
                                              <AvatarImage src={player?.avatarUrl} alt={player?.name} />
                                              <AvatarFallback>{rank.name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <span>{rank.name}</span>
                                      </div>
                                      <span className="font-medium">{rank.wins} {rank.wins === 1 ? 'win' : 'wins'}</span>
                                  </li>
                              );
                          })}
                          </ul>
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground">No wins recorded for this game yet.</p>
                  )}
                </CardContent>
              </Card>
          ))}
        </div>
      ) : (
         <div className="text-center py-12 text-muted-foreground">
          <h3 className="text-lg font-semibold">No games found.</h3>
          <p>Add a new game to get started.</p>
        </div>
      )}
    </div>
    </>
  );
}
