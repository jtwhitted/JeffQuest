
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Crown, Users, ShieldCheck, ShieldX, Medal, Camera } from 'lucide-react';
import React, { useState } from 'react';
import type { Game, Player, Session } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { generatePlayerBio } from '@/ai/flows/generate-player-bio';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { format } from 'date-fns';
import { AvatarCaptureDialog } from './avatar-capture-dialog';
import { useGames } from '@/context/game-context';

type GameHistoryItem = {
    game: Game;
    sessions: (Session & { players: Player[]; winner?: Player })[];
};

export type PlayerWithFullStats = Player & {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  favoriteGame?: Game;
  gameHistory: GameHistoryItem[];
};

interface PlayerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerWithFullStats;
}

// Helper to convert image URL to data URI
async function toDataUri(url: string): Promise<string> {
  // Use a proxy to avoid CORS issues if images are not on the same domain
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function PlayerDetailsDialog({ open, onOpenChange, player }: PlayerDetailsDialogProps) {
  const { toast } = useToast();
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [bio, setBio] = useState<string | null>(null);
  const [isCaptureOpen, setCaptureOpen] = useState(false);
  const { updatePlayer } = useGames();

  const handleGenerateBio = async () => {
    if (bio) return; // Don't re-generate if we already have a bio

    setIsBioLoading(true);
    try {
        const avatarDataUri = await toDataUri(player.avatarUrl);

        const result = await generatePlayerBio({
            name: player.name,
            avatarDataUri,
            gamesPlayed: player.gamesPlayed,
            wins: player.wins,
            winRate: player.winRate,
        });
      setBio(result.bio);
    } catch (error) {
      console.error('Error generating bio:', error);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate a bio for this player. Please try again later.',
      });
    } finally {
      setIsBioLoading(false);
    }
  };

  const handleAvatarCaptured = async (imageDataUrl: string) => {
    setCaptureOpen(false);
    try {
      await updatePlayer(player.id, { avatarUrl: imageDataUrl });
      toast({
        title: 'Avatar Updated!',
        description: 'Your new photo has been saved.',
      });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the new avatar.',
      });
    }
  };
  
  const handleClose = () => {
    setBio(null);
    onOpenChange(false);
  }
  
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  
  const getButtonText = () => {
    if(isBioLoading) return 'Generating...';
    if(bio) return 'Generated';
    return 'Generate Bio';
  }

  return (
    <>
    <AvatarCaptureDialog 
        open={isCaptureOpen}
        onOpenChange={setCaptureOpen}
        onAvatarCaptured={handleAvatarCaptured}
    />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
            <div className="relative">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={player.avatarUrl} alt={player.name} />
                    <AvatarFallback className="text-3xl">{player.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                    onClick={() => setCaptureOpen(true)}
                >
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Retake photo</span>
                </Button>
            </div>
            <DialogTitle className="text-2xl pt-2">{player.name}</DialogTitle>
            <DialogDescription>
                {player.gamesPlayed} games played &bull; {player.wins} wins
            </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-6">
            <div className="space-y-6 py-4">
                <div className="text-sm">
                    <div className="flex justify-between mb-1">
                        <span className="font-medium">Win Rate</span>
                        <span className="text-muted-foreground">{player.winRate}%</span>
                    </div>
                    <Progress value={player.winRate} aria-label={`${player.winRate}% win rate`} />
                </div>

                {player.favoriteGame && (
                <div>
                    <h3 className="mb-2 text-sm font-semibold text-center text-muted-foreground">Favorite Game</h3>
                    <Link href={`/games/${player.favoriteGame.id}`} className="group">
                        <Card className="overflow-hidden">
                        <div className="relative h-24">
                            <Image src={player.favoriteGame.imageUrl} alt={player.favoriteGame.name} fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                            <h4 className="font-bold text-white text-lg">{player.favoriteGame.name}</h4>
                            </div>
                        </div>
                        </Card>
                    </Link>
                </div>
                )}

                <div>
                <h3 className="mb-2 text-sm font-semibold text-center text-muted-foreground">Game History</h3>
                    {player.gameHistory.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                        {player.gameHistory.map(({ game, sessions }) => (
                            <AccordionItem key={game.id} value={game.id}>
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={game.imageUrl} alt={game.name} />
                                        <AvatarFallback>{game.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-semibold">{game.name}</div>
                                        <div className="text-xs text-muted-foreground">{sessions.length} plays</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-3 pl-2">
                                {sessions.map(session => {
                                    const rankedPlayers = session.scores && session.scores.length > 0 
                                    ? [...session.players].sort((a,b) => {
                                        const scoreA = session.scores?.find(s => s.playerId === a.id)?.score ?? -1;
                                        const scoreB = session.scores?.find(s => s.playerId === b.id)?.score ?? -1;
                                        return scoreB - scoreA;
                                    })
                                    : session.players;
                                    
                                    const playerResult = rankedPlayers.findIndex(p => p.id === player.id);
                                    const rank = session.scores && session.scores.length > 0 ? playerResult + 1 : null;
                                    const score = session.scores?.find(s => s.playerId === player.id)?.score;

                                    return (
                                        <li key={session.id} className="text-xs border-l-2 pl-4">
                                            <div className="font-medium">{format(new Date(session.date), 'MMM d, yyyy')}</div>
                                             <div className="mt-1 space-y-1">
                                                {rankedPlayers.map((p, index) => {
                                                    const rank = session.scores && session.scores.length > 0 ? index + 1 : null;
                                                    const pScore = session.scores?.find(s => s.playerId === p.id)?.score;
                                                    return (
                                                        <div key={p.id} className="flex items-center justify-between text-muted-foreground">
                                                          <div className="flex items-center gap-2">
                                                              {rank ? (
                                                                  <span className="flex items-center font-semibold w-8">
                                                                  <Medal className={`mr-1 h-3 w-3 ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-400' : rank === 3 ? 'text-amber-700' : 'text-muted-foreground'}`} />
                                                                  {getOrdinal(rank)}
                                                                  </span>
                                                              ) : <Users className="h-3 w-3 mr-1" />}
                                                              <span>{p.name}</span>
                                                          </div>
                                                          {pScore !== undefined && <span className="font-semibold text-foreground">{pScore}</span>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            {session.cooperativeResult && (
                                                <div className="text-muted-foreground flex items-center mt-1">
                                                    {session.cooperativeResult === 'win' ? <><ShieldCheck className="mr-1.5 h-3 w-3 text-green-500"/> Co-op Win</> : <><ShieldX className="mr-1.5 h-3 w-3 text-red-500"/> Co-op Loss</>}
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
                                </ul>
                            </AccordionContent>
                            </AccordionItem>
                        ))}
                        </Accordion>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground">No games played yet.</p>
                    )}
                </div>
                
                <div>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Player Bio</h3>
                        <Button size="sm" onClick={handleGenerateBio} disabled={isBioLoading || !!bio}>
                            {isBioLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {getButtonText()}
                        </Button>
                    </div>

                    <Card className="mt-2 min-h-[80px] flex items-center justify-center p-4 bg-secondary/50">
                        {isBioLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                        {!isBioLoading && !bio && <p className="text-sm text-muted-foreground">Click "Generate Bio" to create a summary!</p>}
                        {bio && <p className="text-center text-sm prose prose-sm dark:prose-invert">{bio}</p>}
                    </Card>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
