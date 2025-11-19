
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Camera, Dices, Users, Shield, Heart, ShieldOff, Flame, Snowflake, Save, Download, Link as LinkIcon, Pencil } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import type { Game, Player } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { AvatarCaptureDialog } from './avatar-capture-dialog';
import { useGames } from '@/context/game-context';
import { LegendaryPlayerCard } from './legendary-player-card';
import { generateLegendaryCard } from '@/ai/flows/generate-legendary-card';
import { updatePlayerAction } from '@/lib/actions';
import { Separator } from './ui/separator';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from './ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { BggImportDialog } from './bgg-import-dialog';
import { EditPlayerDialog } from './edit-player-dialog';

type GameHistoryItem = {
    game: Game;
    sessions: (Session & { players: Player[]; winner?: Player })[];
    winRate: number;
    playCount: number;
};

export type PlayerWithFullStats = Player & {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  favoriteGame?: Game;
  gameHistory: GameHistoryItem[];
  nemesis?: Player;
  mostPlayedWith?: Player;
  bestGame?: Game;
  worstGame?: Game;
  streak?: 'hot' | 'cold';
};

interface PlayerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerWithFullStats;
}

type LegendaryCardState = {
  loading: boolean;
  error: string | null;
  data: { title: string; bio: string; } | null;
}

export function PlayerDetailsDialog({ open, onOpenChange, player }: PlayerDetailsDialogProps) {
  const { toast } = useToast();
  const { updatePlayer } = useGames();
  const [legendaryCardState, setLegendaryCardState] = useState<LegendaryCardState>({ loading: false, error: null, data: null });
  const [isCaptureOpen, setCaptureOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Conjuring epicness...');
  

  // Effect to populate the card state if the player already has legendary data
  useEffect(() => {
    if (open) { // Only run when the dialog is open
      if (player.legendaryTitle && player.legendaryBio) {
        setLegendaryCardState({
          loading: false,
          error: null,
          data: { 
              title: player.legendaryTitle, 
              bio: player.legendaryBio, 
            }
        });
      } else {
        // Reset when the dialog opens for a new player without a card
        setLegendaryCardState({ loading: false, error: null, data: null });
      }
    }
  }, [player, open]);

  const handleGenerateCard = async () => {
    setLegendaryCardState({ loading: true, error: null, data: null });
    
    let result: { title: string; bio: string; } | null = null;
    let lastError: any = null;
    const retries = 3;
    let delayMs = 1000;

    for (let i = 0; i < retries; i++) {
        try {
            setLoadingMessage('Conjuring epicness...');
            result = await generateLegendaryCard({
                name: player.name,
                gamesPlayed: player.gamesPlayed,
                wins: player.wins,
                winRate: player.winRate,
                favoriteGame: player.favoriteGame?.name,
            });
            lastError = null; // Clear error on success
            break; // Exit loop on success
        } catch (error) {
            lastError = error;
            if (i < retries - 1) {
                setLoadingMessage(`The AI is busy, retrying in ${delayMs / 1000}s...`);
                await new Promise(res => setTimeout(res, delayMs));
                delayMs *= 2; // Exponential backoff
            }
        }
    }

    if (result) {
        setLegendaryCardState({ loading: false, error: null, data: result });
        await updatePlayerAction(player.id, { 
            legendaryTitle: result.title, 
            legendaryBio: result.bio,
        });

        toast({
            title: "Legend Forged!",
            description: "The player's epic tale has been written."
        });
    } else {
        const errorMessage = lastError?.message || 'The AI is very busy right now. Please try again in a minute.';
        setLegendaryCardState({ loading: false, error: errorMessage, data: null });
        toast({
            variant: 'destructive',
            title: 'AI Error',
            description: errorMessage,
        });
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
    onOpenChange(false);
  };
  
  const getButtonText = () => {
    if (legendaryCardState.loading) return loadingMessage;
    if (legendaryCardState.data) return 'Re-generate Card';
    if (legendaryCardState.error) return 'Try Again';
    return 'Generate Legendary Card';
  };

  return (
    <>
      <AvatarCaptureDialog 
        open={isCaptureOpen}
        onOpenChange={setCaptureOpen}
        onAvatarCaptured={handleAvatarCaptured}
      />
       <EditPlayerDialog
        open={isEditModalOpen}
        onOpenChange={setEditModalOpen}
        player={player}
      />
      {player.bggUsername && (
         <BggImportDialog
            open={isImportModalOpen}
            onOpenChange={setImportModalOpen}
            bggUsername={player.bggUsername}
            playerId={player.id}
        />
      )}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="items-center text-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={player.avatarUrl} alt={player.name} />
                <AvatarFallback className="text-3xl">{player.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-2 right-10 rounded-full h-8 w-8"
                onClick={() => setCaptureOpen(true)}
              >
                <Camera className="h-4 w-4" />
                <span className="sr-only">Retake photo</span>
              </Button>
               <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit player</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2">
                <DialogTitle className="text-2xl">{player.name}</DialogTitle>
                {player.streak === 'hot' && (
                    <Badge variant="outline" className="border-orange-400 text-orange-400">
                        <Flame className="mr-1.5 h-4 w-4" />
                        Hot Streak
                    </Badge>
                )}
                {player.streak === 'cold' && (
                    <Badge variant="outline" className="border-blue-400 text-blue-400">
                        <Snowflake className="mr-1.5 h-4 w-4" />
                        In a Slump
                    </Badge>
                )}
            </div>
             {player.bggUsername && (
                <button 
                    onClick={() => setImportModalOpen(true)} 
                    className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                >
                    <LinkIcon className="h-3 w-3" />
                    {player.bggUsername}
                </button>
             )}
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
              
              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                   {player.favoriteGame ? (
                     <div className="flex items-center justify-between">
                       <span className="flex items-center text-muted-foreground"><Heart className="mr-2"/> Favorite Game</span>
                       <Link href={`/games/${player.favoriteGame.id}`} className="flex items-center gap-2 font-medium hover:underline">
                          <Image src={player.favoriteGame.imageUrl} alt={player.favoriteGame.name} width={24} height={24} className="rounded-sm object-cover" />
                          <span>{player.favoriteGame.name}</span>
                       </Link>
                     </div>
                   ) : (
                    <div className="flex items-center justify-between">
                       <span className="flex items-center text-muted-foreground"><Heart className="mr-2"/> Favorite Game</span>
                       <span className="font-medium text-muted-foreground italic">No games played yet</span>
                    </div>
                   )}
                    {player.nemesis ? (
                        <>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><ShieldOff className="mr-2"/> Nemesis</span>
                            <div className="flex items-center gap-2 font-medium">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={player.nemesis.avatarUrl} alt={player.nemesis.name} />
                                    <AvatarFallback>{player.nemesis.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{player.nemesis.name}</span>
                            </div>
                        </div>
                        </>
                    ) : (
                      <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-muted-foreground"><ShieldOff className="mr-2"/> Nemesis</span>
                        <span className="font-medium text-muted-foreground italic">No rivals yet</span>
                      </div>
                      </>
                    )}
                     {player.mostPlayedWith ? (
                        <>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><Users className="mr-2"/> Main Partner</span>
                            <div className="flex items-center gap-2 font-medium">
                                 <Avatar className="h-6 w-6">
                                    <AvatarImage src={player.mostPlayedWith.avatarUrl} alt={player.mostPlayedWith.name} />
                                    <AvatarFallback>{player.mostPlayedWith.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{player.mostPlayedWith.name}</span>
                            </div>
                        </div>
                        </>
                    ) : (
                       <>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><Users className="mr-2"/> Main Partner</span>
                            <span className="font-medium text-muted-foreground italic">N/A</span>
                        </div>
                        </>
                    )}
                     {player.bestGame ? (
                        <>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><Shield className="mr-2"/> Best Game</span>
                            <Link href={`/games/${player.bestGame.id}`} className="flex items-center gap-2 font-medium hover:underline">
                                <Image src={player.bestGame.imageUrl} alt={player.bestGame.name} width={24} height={24} className="rounded-sm object-cover" />
                                <span>{player.bestGame.name}</span>
                            </Link>
                        </div>
                        </>
                    ) : (
                        <>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><Shield className="mr-2"/> Best Game</span>
                            <span className="font-medium text-muted-foreground italic">N/A</span>
                        </div>
                        </>
                    )}
                     {player.worstGame && player.worstGame.id !== player.bestGame?.id ? (
                       <>
                       <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><Dices className="mr-2"/> Worst Game</span>
                            <Link href={`/games/${player.worstGame.id}`} className="flex items-center gap-2 font-medium hover:underline">
                                <Image src={player.worstGame.imageUrl} alt={player.worstGame.name} width={24} height={24} className="rounded-sm object-cover" />
                                <span>{player.worstGame.name}</span>
                            </Link>
                        </div>
                        </>
                    ) : (
                       <>
                       <Separator />
                        <div className="flex items-center justify-between">
                            <span className="flex items-center text-muted-foreground"><Dices className="mr-2"/> Worst Game</span>
                            <span className="font-medium text-muted-foreground italic">N/A</span>
                        </div>
                        </>
                    )}
                </CardContent>
              </Card>

              {player.gameHistory.length > 0 && (
                <Accordion type="single" collapsible>
                    <AccordionItem value="game-stats">
                        <AccordionTrigger>Game-by-Game Stats</AccordionTrigger>
                        <AccordionContent>
                        <ul className="space-y-4">
                            {player.gameHistory.map(gh => (
                            <li key={gh.game.id}>
                                <div className="flex items-start gap-4">
                                <Link href={`/games/${gh.game.id}`}>
                                    <Image src={gh.game.imageUrl} alt={gh.game.name} width={48} height={48} className="rounded-md object-cover h-12 w-12" />
                                </Link>
                                <div className="flex-1 text-sm">
                                    <Link href={`/games/${gh.game.id}`} className="font-semibold hover:underline">{gh.game.name}</Link>
                                    <p className="text-xs text-muted-foreground">{gh.playCount} {gh.playCount === 1 ? 'play' : 'plays'}</p>
                                    <div className="flex justify-between mt-1">
                                    <span>Win Rate</span>
                                    <span className="text-muted-foreground">{gh.winRate}%</span>
                                    </div>
                                    <Progress value={gh.winRate} className="h-2 mt-1" />
                                </div>
                                </div>
                            </li>
                            ))}
                        </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                )}

              <div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Legendary Player Card</h3>
                        <Button size="sm" onClick={handleGenerateCard} disabled={legendaryCardState.loading}>
                            {legendaryCardState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {getButtonText()}
                        </Button>
                    </div>
                    
                </div>

                <Card className="mt-2 min-h-[200px] flex items-center justify-center p-4 bg-secondary/50">
                  {legendaryCardState.loading && (
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="mt-2 text-sm text-muted-foreground">{loadingMessage}</p>
                    </div>
                  )}
                  {!legendaryCardState.loading && !legendaryCardState.data && !legendaryCardState.error && (
                    <p className="text-sm text-muted-foreground text-center">Click the button to forge this player into a legend!</p>
                  )}
                  {legendaryCardState.error && <p className="text-sm text-destructive text-center">{legendaryCardState.error}</p>}
                  {legendaryCardState.data && (
                    <LegendaryPlayerCard 
                      name={player.name}
                      title={legendaryCardState.data.title}
                      bio={legendaryCardState.data.bio}
                      avatarDataUri={player.avatarUrl}
                      wins={player.wins}
                      gamesPlayed={player.gamesPlayed}
                      winRate={player.winRate}
                    />
                  )}
                </Card>
              </div>
            </div>
          </ScrollArea>
           <DialogFooter>
             <Button variant="outline" onClick={handleClose}>Close</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
