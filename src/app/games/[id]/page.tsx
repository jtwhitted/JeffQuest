
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Clock, BarChart3, Star, Scale, Dices, Loader2, Trophy, LineChart, WandSparkles, UploadCloud, Youtube, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GameSessionHistory } from './_components/game-session-history';
import { useGames } from '@/context/game-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { searchYoutubeAction } from '@/lib/actions';
import type { YoutubeVideo } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RulesWizardDialog } from '@/components/rules-wizard-dialog';
import { RulebookManagerDialog } from '@/components/rulebook-manager-dialog';
import { VideoPlayerDialog } from '@/components/video-player-dialog';

export default function GameDetailPage() {
  const { id } = useParams();
  const { games, sessions, players, isLoading, setFavoriteVideo } = useGames();
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [isRulebookManagerOpen, setRulebookManagerOpen] = useState(false);
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null);
  const { toast } = useToast();

  const game = games.find(g => g.id === id);

  useEffect(() => {
    if (game) {
      const fetchVideos = async () => {
        setIsVideoLoading(true);
        try {
          const videoResults = await searchYoutubeAction(game.name);
          setVideos(videoResults);
        } catch (error) {
          console.error("Failed to fetch youtube videos", error);
        } finally {
          setIsVideoLoading(false);
        }
      };
      fetchVideos();
    }
  }, [game]);

  const sortedVideos = useMemo(() => {
    if (!game || !videos) return [];
    return [...videos].sort((a, b) => {
      if (a.id === game.favoriteVideoId) return -1;
      if (b.id === game.favoriteVideoId) return 1;
      return 0;
    });
  }, [videos, game]);

  const handleFavorite = async (videoId: string) => {
    if (!game) return;
    setIsFavoriting(true);
    const newFavoriteId = game.favoriteVideoId === videoId ? undefined : videoId;
    try {
        await setFavoriteVideo(game.id, newFavoriteId);
        toast({
            title: newFavoriteId ? 'Video Favorited' : 'Favorite Removed',
            description: newFavoriteId ? 'This is now the top video for this game.' : undefined,
        });
    } catch (e) {
        console.error('Failed to update favorite video:', e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update favorite video.' });
    } finally {
        setIsFavoriting(false);
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    notFound();
  }

  const gameSessions = sessions.filter(s => s.gameId === game.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate high score
  let highScore: { score: number, playerId: string, sessionId: string } | null = null;
  gameSessions.forEach(session => {
    session.scores?.forEach(s => {
      if (s.score && (!highScore || s.score > highScore.score)) {
        highScore = { score: s.score, playerId: s.playerId, sessionId: session.id };
      }
    });
  });
  const highScorePlayer = highScore ? players.find(p => p.id === highScore.playerId) : null;

  // Calculate average duration
  const sessionsWithDuration = gameSessions.filter(s => typeof s.duration === 'number');
  const averageDuration = sessionsWithDuration.length > 0
    ? Math.round(sessionsWithDuration.reduce((acc, s) => acc + s.duration!, 0) / sessionsWithDuration.length)
    : null;


  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : 'N/A';
  const formatComplexity = (complexity?: number) => complexity ? complexity.toFixed(2) : 'N/A';
  const userRatings = game.userRatings ? Object.entries(game.userRatings) : [];
  const bggComments = game.bggComments || [];

  return (
    <>
      <VideoPlayerDialog 
        open={!!selectedVideo}
        onOpenChange={() => setSelectedVideo(null)}
        video={selectedVideo}
      />
      <RulesWizardDialog
        open={isWizardOpen}
        onOpenChange={setWizardOpen}
        game={game}
      />
      <RulebookManagerDialog
          open={isRulebookManagerOpen}
          onOpenChange={setRulebookManagerOpen}
          game={game}
      />
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
                                {highScorePlayer && highScore && (
                                    <>
                                        <Separator />
                                        <Link href={`/sessions/${highScore.sessionId}`} className="block -m-2 p-2 rounded-md hover:bg-muted/50">
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
                                        </Link>
                                    </>
                                )}
                                {game.documents && game.documents.length > 0 && (
                                  <>
                                    <Separator />
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => setWizardOpen(true)}>
                                        <WandSparkles className="mr-2 h-4 w-4" />
                                        Rules Wizard
                                    </Button>
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
             {isVideoLoading ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>How to Play</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-48">
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </CardContent>
                </Card>
            ) : sortedVideos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>How to Play</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <Carousel opts={{ align: "start", loop: false }}>
                            <CarouselContent>
                                {sortedVideos.map((video) => (
                                <CarouselItem key={video.id} className="basis-full md:basis-1/2 lg:basis-1/3">
                                    <div className="relative group">
                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                            <button className="w-full text-left" onClick={() => setSelectedVideo(video)}>
                                                <div className="relative aspect-video">
                                                    <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <Youtube className="h-12 w-12 text-white/80" />
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <p className="font-semibold text-sm truncate">{video.title}</p>
                                                    <p className="text-xs text-muted-foreground">{video.channel}</p>
                                                </div>
                                            </button>
                                        </Card>
                                         <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className={cn("absolute top-2 right-2 h-8 w-8 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity", game.favoriteVideoId === video.id && 'opacity-100')}
                                            onClick={() => handleFavorite(video.id)}
                                            disabled={isFavoriting}
                                            >
                                            {isFavoriting && game.favoriteVideoId !== video.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Star className={cn("h-4 w-4", game.favoriteVideoId === video.id ? 'text-amber-400 fill-amber-400' : 'text-white/80')} />
                                            )}
                                            <span className="sr-only">Favorite video</span>
                                        </Button>
                                    </div>
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </CardContent>
                </Card>
            )}
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
                     <Separator />
                    <div className='space-y-2'>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setRulebookManagerOpen(true)}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Manage Rulebooks
                        </Button>
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
                                <div className="flex items-center justify-between pl-6">
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
                    {bggComments.length > 0 && (
                        <>
                        <Separator />
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="p-0 hover:no-underline">
                                     <span className="flex items-center text-muted-foreground"><MessageSquare className="mr-2"/>BGG Comments</span>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <ScrollArea className="h-48 rounded-md border bg-muted/50 p-3">
                                        <div className="space-y-4">
                                            {bggComments.map((comment, index) => (
                                                <div key={index}>
                                                    <p className="font-semibold text-xs">{comment.username}</p>
                                                    <p className="text-xs text-muted-foreground italic">&quot;{comment.comment}&quot;</p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      <GameSessionHistory sessions={gameSessions} allPlayers={players} />
    </div>
    </>
  )
}
