import { getSessions, getPlayers } from '@/lib/data';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Swords, Trophy } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Players | Tabletop Tracker',
    description: 'View stats and rankings for all players.',
};

export default async function PlayersPage() {
  const sessions = await getSessions();
  const players = await getPlayers();

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
    <div className="space-y-8">
      <PageHeader
        title="Player Rankings"
        description="See how everyone stacks up against each other."
      />
      {playersWithStats.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {playersWithStats.map(player => (
            <Card key={player.id}>
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
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <h3 className="text-lg font-semibold">No players found.</h3>
          <p>Add some players by logging a new session.</p>
        </div>
      )}
    </div>
  );
}
