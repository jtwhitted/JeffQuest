'use client';
import { getSessions, getPlayers } from '@/lib/data';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Swords, Trophy, PlusCircle, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import { useState, useEffect } from 'react';
import type { Player, Session } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { deletePlayer } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { PlayerDetailsDialog } from '@/components/player-details-dialog';

// export const metadata: Metadata = {
//     title: 'Players | Tabletop Tracker',
//     description: 'View stats and rankings for all players.',
// };

export default function PlayersPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAddPlayerOpen, setAddPlayerOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player & { gamesPlayed: number; wins: number; winRate: number} | null>(null);


  useEffect(() => {
    async function fetchData() {
      setSessions(await getSessions());
      setPlayers(await getPlayers());
    }
    fetchData();
  }, []);

  const handlePlayerAdded = (newPlayer: Player) => {
    setPlayers(prev => [...prev, newPlayer]);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    try {
      await deletePlayer(playerToDelete.id);
      setPlayers(prev => prev.filter(p => p.id !== playerToDelete.id));
      toast({
        title: "Player Removed",
        description: `${playerToDelete.name} has been removed from the group.`
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove player."
      });
    } finally {
      setPlayerToDelete(null);
    }
  }

  const playersWithStats = players.map(player => {
    const gamesPlayed = sessions.filter(s => s.playerIds.includes(player.id)).length;
    const wins = sessions.filter(s => s.winnerId === player.id).length;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    return {
      ...player,
      gamesPlayed,
      wins,
      winRate
    };
  }).sort((a,b) => b.winRate - a.winRate || b.wins - a.wins);

  return (
    <>
      <AddPlayerDialog open={isAddPlayerOpen} onOpenChange={setAddPlayerOpen} onPlayerAdded={handlePlayerAdded} />
      <DeleteConfirmationDialog 
        open={!!playerToDelete}
        onOpenChange={() => setPlayerToDelete(null)}
        onConfirm={handleDeletePlayer}
        title="Delete Player"
        description={`Are you sure you want to delete ${playerToDelete?.name}? All associated session data will also be affected.`}
      />
      {selectedPlayer && (
        <PlayerDetailsDialog
          open={!!selectedPlayer}
          onOpenChange={() => setSelectedPlayer(null)}
          player={selectedPlayer}
        />
      )}
      <div className="space-y-8">
        <PageHeader
          title="Player Rankings"
          description="See how everyone stacks up against each other."
        >
           <Button onClick={() => setAddPlayerOpen(true)}>
            <PlusCircle className="mr-2" />
            Add New Player
          </Button>
        </PageHeader>
        {playersWithStats.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {playersWithStats.map(player => (
              <Card 
                key={player.id} 
                className="group/card relative cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => setSelectedPlayer(player)}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={player.avatarUrl} alt={player.name} />
                    <AvatarFallback className="text-xl">{player.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{player.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                          <Swords className="mr-1.5 h-4 w-4" />
                          {player.gamesPlayed} played
                      </div>
                      <div className="flex items-center">
                          <Trophy className="mr-1.5 h-4 w-4" />
                          {player.wins} wins
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                      <div className="flex justify-between mb-1">
                          <span className="font-medium">Win Rate</span>
                          <span className="text-muted-foreground">{player.winRate}%</span>
                      </div>
                      <Progress value={player.winRate} aria-label={`${player.winRate}% win rate`} />
                  </div>
                </CardContent>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setPlayerToDelete(player); }}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete player</span>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <h3 className="text-lg font-semibold">No players found.</h3>
            <p>Add some players to get started.</p>
          </div>
        )}
      </div>
    </>
  );
}
