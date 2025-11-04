'use client';
import { getSessions, getGames, getPlayers } from '@/lib/data';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { Crown, Swords, PlusCircle, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import { useState, useEffect } from 'react';
import type { Game, Player, Session } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddGameDialog } from '@/components/add-game-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { deleteGame } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

// export const metadata: Metadata = {
//     title: 'Games | Tabletop Tracker',
//     description: 'Statistics for every game you have played.',
// };

export default function GamesPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAddGameOpen, setAddGameOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  useEffect(() => {
    async function fetchData() {
      setSessions(await getSessions());
      setGames(await getGames());
      setPlayers(await getPlayers());
    }
    fetchData();
  }, []);
  
  const handleGameAdded = (newGame: Game) => {
    setGames(prev => [...prev, newGame]);
  }

  const handleDeleteGame = async () => {
    if (!gameToDelete) return;
    try {
      await deleteGame(gameToDelete.id);
      setGames(prev => prev.filter(g => g.id !== gameToDelete.id));
      toast({
        title: "Game Deleted",
        description: `${gameToDelete.name} has been removed from your collection.`
      });
    } catch(e) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete game."
      });
    } finally {
      setGameToDelete(null);
    }
  }

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
  }).sort((a,b) => b.playCount - a.playCount);

  return (
    <>
    <AddGameDialog open={isAddGameOpen} onOpenChange={setAddGameOpen} onGameAdded={handleGameAdded} />
    <DeleteConfirmationDialog 
      open={!!gameToDelete}
      onOpenChange={() => setGameToDelete(null)}
      onConfirm={handleDeleteGame}
      title="Delete Game"
      description={`Are you sure you want to delete ${gameToDelete?.name}? All associated session data will also be affected.`}
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

      {gamesWithStats.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {gamesWithStats.map(game => (
            <Card key={game.id} className="flex flex-col group/card">
              <CardHeader className="flex flex-row items-start gap-4">
                <Image src={game.imageUrl} alt={game.name} width={80} height={80} className="rounded-lg object-cover" data-ai-hint={`${game.category} boardgame`} />
                <div className="flex-1">
                  <CardTitle>{game.name}</CardTitle>
                  <CardDescription>{game.category}</CardDescription>
                  <div className="mt-2 flex items-center text-sm text-muted-foreground">
                    <Swords className="mr-2 h-4 w-4" />
                    <span>Played {game.playCount} {game.playCount === 1 ? 'time' : 'times'}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 hover:bg-destructive/10 transition-opacity" onClick={() => setGameToDelete(game)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete game</span>
                </Button>
              </CardHeader>
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
