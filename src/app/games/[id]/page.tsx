import { getGameById, getSessions, getPlayers } from '@/lib/data';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Clock, BarChart3, Star, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DeleteGameButton } from './_components/delete-game-button';
import { GameSessionHistory } from './_components/game-session-history';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGameById(params.id);
  
  if (!game) {
    return {
      title: 'Game Not Found | Tabletop Tracker',
    };
  }

  return {
    title: `${game.name} | Tabletop Tracker`,
    description: `Detailed information and statistics for ${game.name}.`,
  };
}


export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const game = await getGameById(params.id);
  if (!game) {
    notFound();
  }

  const allSessions = await getSessions();
  const allPlayers = await getPlayers();
  const gameSessions = allSessions.filter(s => s.gameId === game.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : 'N/A';
  const formatComplexity = (complexity?: number) => complexity ? complexity.toFixed(2) : 'N/A';

  return (
    <div className="space-y-8">
       <PageHeader
        title={game.name}
        description={game.yearPublished ? `Published in ${game.yearPublished}` : 'A game in your collection'}
      >
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
            <Link href="/games">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Games
            </Link>
            </Button>
            <DeleteGameButton gameId={game.id} gameName={game.name} />
        </div>
      </PageHeader>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                            <Image src={game.imageUrl} alt={game.name} width={300} height={300} className="w-full rounded-lg object-cover aspect-square" data-ai-hint={`${game.category} box art`} />
                        </div>
                        <div className="md:w-2/3 space-y-4">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">{game.name}</h2>
                                <div className="prose prose-sm dark:prose-invert text-muted-foreground" dangerouslySetInnerHTML={{__html: game.description || '<p>No description available.</p>'}} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Mechanics & Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {game.designers && game.designers.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Designers</h4>
                            <div className="flex flex-wrap gap-2">
                                {game.designers.map(d => <Badge key={d} variant="outline">{d}</Badge>)}
                            </div>
                        </div>
                    )}
                     {game.publishers && game.publishers.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Publishers</h4>
                            <div className="flex flex-wrap gap-2">
                                {game.publishers.map(p => <Badge key={p} variant="outline">{p}</Badge>)}
                            </div>
                        </div>
                    )}
                     {game.mechanics && game.mechanics.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Mechanics</h4>
                            <div className="flex flex-wrap gap-2">
                                {game.mechanics.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Game Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><Users className="mr-2"/> Players</span>
                        <span className="font-medium">{game.minPlayers} - {game.maxPlayers}</span>
                    </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><Clock className="mr-2"/> Playtime</span>
                        <span className="font-medium">{game.minPlaytime} - {game.maxPlaytime} min</span>
                    </div>
                     <Separator />
                    <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><BarChart3 className="mr-2"/> Difficulty</span>
                        <span className="font-medium">{game.difficulty}</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>BGG Ratings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><Star className="mr-2"/> Average Rating</span>
                        <span className="font-medium">{formatRating(game.rating)} / 10</span>
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><Users className="mr-2"/>Total Ratings</span>
                        <span className="font-medium">{game.ratingCount?.toLocaleString()}</span>
                    </div>
                     <Separator />
                    <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><Scale className="mr-2"/> Complexity</span>
                        <span className="font-medium">{formatComplexity(game.complexity)} / 5</span>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      <GameSessionHistory sessions={gameSessions} allPlayers={allPlayers} />
    </div>
  );
}
