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
import { Loader2, Sparkles, Crown, Users, ShieldCheck, ShieldX } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [bio, setBio] = useState<string | null>(null);

  const handleGenerateBio = async () => {
    setIsLoading(true);
    setBio(null);
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
        description: 'Could not generate a bio for this player.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setBio(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
            <Avatar className="h-24 w-24">
                <AvatarImage src={player.avatarUrl} alt={player.name} />
                <AvatarFallback className="text-3xl">{player.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <DialogTitle className="text-2xl">{player.name}</DialogTitle>
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
                            <Image src={player.favoriteGame.imageUrl} alt={player.favoriteGame.name} fill className="object-cover" />
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
                                <ul className="space-y-3 pl-6">
                                {sessions.map(session => (
                                    <li key={session.id} className="text-xs">
                                        <div className="font-medium">{format(new Date(session.date), 'MMM d, yyyy')}</div>
                                        <div className="text-muted-foreground flex items-center">
                                            <Users className="mr-1.5 h-3 w-3" />
                                            {session.players.map(p => p.name).join(', ')}
                                        </div>
                                         <div className="text-muted-foreground flex items-center">
                                            {session.cooperativeResult === 'win' && <><ShieldCheck className="mr-1.5 h-3 w-3 text-green-500"/> Co-op Win</>}
                                            {session.cooperativeResult === 'loss' && <><ShieldX className="mr-1.5 h-3 w-3 text-red-500"/> Co-op Loss</>}
                                            {session.winner && <><Crown className="mr-1.5 h-3 w-3 text-amber-400"/> {session.winner.name} won</>}
                                         </div>
                                    </li>
                                ))}
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
                        <h3 className="font-semibold">Humorous AI Bio</h3>
                        <Button size="sm" onClick={handleGenerateBio} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2" /> : <Sparkles className="mr-2" />}
                            Generate
                        </Button>
                    </div>

                    <Card className="mt-2 min-h-[80px] flex items-center justify-center p-4 bg-secondary/50">
                        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                        {!isLoading && !bio && <p className="text-sm text-muted-foreground">Click generate to create a bio!</p>}
                        {bio && <p className="text-center text-sm prose prose-sm dark:prose-invert">{bio}</p>}
                    </Card>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
