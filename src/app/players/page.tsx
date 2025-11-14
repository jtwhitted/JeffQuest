
'use client';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Swords, Trophy, PlusCircle, Trash2, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Player, Session, Game } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlayerDetailsDialog, type PlayerWithFullStats } from '@/components/player-details-dialog';
import { useGames } from '@/context/game-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LegendaryPlayerCard } from '@/components/legendary-player-card';

export default function PlayersPage() {
  const { toast } = useToast();
  const { sessions, players, games, isLoading, addPlayer, deletePlayer } = useGames();
  const [isAddPlayerOpen, setAddPlayerOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithFullStats | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);


  const handlePlayerAdded = (newPlayer: Player) => {
    // The context handles adding the player, so we just need to close the dialog
    setAddPlayerOpen(false);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    try {
      await deletePlayer(playerToDelete.id);
       toast({
        title: "Player Removed",
        description: `${playerToDelete.name} has been removed.`
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

  const playersWithStats: PlayerWithFullStats[] = players.map(player => {
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

        const gameSessionsForThisGame = playerSessions.filter(s => s.gameId === gameId);
        const winsInGame = gameSessionsForThisGame.filter(s => s.winnerId === player.id || (s.cooperativeResult === 'win' && s.playerIds.includes(player.id))).length;
        const winRateInGame = gameSessionsForThisGame.length > 0 ? Math.round((winsInGame / gameSessionsForThisGame.length) * 100) : 0;
        
        const sessions = gameSessionsForThisGame
          .map(session => ({
            ...session,
            players: session.playerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean) as Player[],
            winner: players.find(p => p.id === session.winnerId),
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
          game,
          sessions,
          winRate: winRateInGame,
        };
      })
      .filter(Boolean) as PlayerWithFullStats['gameHistory'];

    const competitiveGames = playerSessions.filter(s => !s.isCooperative && s.playerIds.length > 1);

    const nemesisCounts = competitiveGames
        .filter(s => s.winnerId !== player.id)
        .reduce((acc, session) => {
            if (session.winnerId) {
                acc[session.winnerId] = (acc[session.winnerId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

    const topNemesisId = Object.entries(nemesisCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
    const nemesis = players.find(p => p.id === topNemesisId);
    
    const partnerCounts = playerSessions.reduce((acc, session) => {
        session.playerIds.forEach(pId => {
            if (pId !== player.id) {
                acc[pId] = (acc[pId] || 0) + 1;
            }
        });
        return acc;
    }, {} as Record<string, number>);

    const topPartnerId = Object.entries(partnerCounts).sort(([,a], [,b]) => b-a)[0]?.[0];
    const mostPlayedWith = players.find(p => p.id === topPartnerId);
    
    const gameWinRates = gameHistory
        .filter(gh => competitiveGames.some(cg => cg.gameId === gh.game.id)) // Only include competitive games
        .sort((a, b) => b.winRate - a.winRate);

    const bestGame = gameWinRates[0]?.game;
    const worstGame = gameWinRates[gameWinRates.length - 1]?.game;

    return {
      ...player,
      gamesPlayed,
      wins,
      winRate,
      favoriteGame,
      gameHistory,
      nemesis,
      mostPlayedWith,
      bestGame,
      worstGame,
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
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : playersWithStats.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {playersWithStats.map(player => (
              <Collapsible 
                key={player.id} 
                open={expandedPlayerId === player.id}
                onOpenChange={(isOpen) => setExpandedPlayerId(isOpen ? player.id : null)}
              >
                <Card 
                  className="group/card relative transition-shadow hover:shadow-lg"
                >
                  <CardHeader 
                    className="flex flex-row items-center gap-4 cursor-pointer"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={player.avatarUrl} alt={player.name} />
                      <AvatarFallback className="text-xl">{player.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">{player.name}</CardTitle>
                      {player.legendaryTitle && (
                        <p className="flex items-center gap-1 text-sm text-amber-400 italic">
                          <Sparkles className="h-4 w-4" />
                          {player.legendaryTitle}
                        </p>
                      )}
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
                    {player.legendaryTitle && player.legendaryBio && (
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-4 w-full">
                          Show Legendary Card
                          <ChevronDown className="h-4 w-4 ml-2 transition-transform data-[state=open]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </CardContent>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setPlayerToDelete(player); }}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete player</span>
                  </Button>
                </Card>
                <CollapsibleContent className="mt-2">
                   {player.legendaryTitle && player.legendaryBio && (
                      <LegendaryPlayerCard
                        name={player.name}
                        title={player.legendaryTitle}
                        bio={player.legendaryBio}
                        avatarDataUri={player.avatarUrl}
                        wins={player.wins}
                        gamesPlayed={player.gamesPlayed}
                        winRate={player.winRate}
                      />
                    )}
                </CollapsibleContent>
              </Collapsible>
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
