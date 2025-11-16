

'use client';
import React from 'react';
import { useParams, notFound } from 'next/navigation';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Clock, BarChart3, Star, Scale, Dices, Loader2, Trophy, LineChart } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GameSessionHistory } from './_components/game-session-history';
import { useGames } from '@/context/game-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RulebookEditor } from '@/components/rulebook-editor';

export default function GameDetailPage() {
  const { id } = useParams();
  const { games, sessions, players, isLoading } = useGames();
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const game = games.find(g => g.id === id);

  if (!game) {
    notFound();
  }

  const gameSessions = sessions.filter(s => s.gameId === game.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate high score
  let highScore = { score: 0, playerId: '' };
  gameSessions.forEach(session => {
    session.scores?.forEach(s => {
      if (s.score && s.score > highScore.score) {
        highScore = { score: s.score, playerId: s.playerId };
      }
    });
  });
  const highScorePlayer = players.find(p => p.id === highScore.playerId);

  // Calculate average duration
  const sessionsWithDuration = gameSessions.filter(s => typeof s.duration === 'number');
  const averageDuration = sessionsWithDuration.length > 0
    ? Math.round(sessionsWithDuration.reduce((acc, s) => acc + s.duration!, 0) / sessionsWithDuration.length)
    : null;


  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : 'N/A';
  const formatComplexity = (complexity?: number) => complexity ? complexity.toFixed(2) : 'N/A';
  const userRatings = game.userRatings ? Object.entries(game.userRatings) : [];

  return (
    <div className="space-y-8">
       <PageHeader
        title={game.name}
        description={game.yearPublished ? `Published in ${game.yearPublished}` : 'A game in your collection'}
      >
        <Button asChild variant="outline">
        <Link href="/games">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
        </Link>
        </Button>
      </PageHeader>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3 space-y-4">
                            {game.imageUrl ? (
                                <Image src={game.imageUrl} alt={game.name} width={300} height={300} className="w-full rounded-lg object-cover aspect-square" data-ai-hint={`${game.name} board game`} />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted aspect-square">
                                    <Dices className="h-16 w-16 text-muted-foreground" />
                                </div>
                            )}
                             <div className="space-y-4 text-sm">
                                {averageDuration && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center text-muted-foreground"><LineChart className="mr-2"/> Avg. Duration</span>
                                            <span className="font-medium">{averageDuration} min</span>
                                        </div>
                                    </>
                                )}
                                {highScorePlayer && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center text-muted-foreground"><Trophy className="mr-2 text-amber-400"/> High Score</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{highScore.score}</span>
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={highScorePlayer.avatarUrl} alt={highScorePlayer.name} />
                                                    <AvatarFallback>{highScorePlayer.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                        </div>
                                    </>
                                )}
                             </div>
                        </div>
                        <div className="md:w-2/3 space-y-4">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">{game.name}</h2>
                                <div className="prose prose-sm dark:prose-invert text-muted-foreground" dangerouslySetInnerHTML={{__html: game.description?.replace(/\\n/g, '<br />').replace(/&#10;/g, '<br />') || '<p>No description available.</p>'}} />
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
                    {game.category && game.category.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Categories</h4>
                            <div className="flex flex-wrap gap-2">
                                {game.category.map(c => <Badge key={c} variant="outline">{c}</Badge>)}
                            </div>
                        </div>
                    )}
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
                            <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Publisher</h4>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{game.publishers[0]}</Badge>
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
                     {userRatings.map(([playerId, rating]) => {
                        const player = players.find(p => p.id === playerId);
                        if (!player) return null;
                        return (
                            <React.Fragment key={playerId}>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center text-muted-foreground">
                                        <Avatar className="h-6 w-6 mr-2">
                                            <AvatarImage src={player.avatarUrl} alt={player.name} />
                                            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {player.name}'s Rating
                                    </span>
                                    <span className="font-medium">{formatRating(rating)} / 10</span>
                                </div>
                            </React.Fragment>
                        );
                     })}
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
      <GameSessionHistory sessions={gameSessions} allPlayers={players} />
      <div className="mx-auto max-w-2xl">
        <RulebookEditor game={game} />
      </div>
    </div>
  );
}
