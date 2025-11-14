
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
import { Loader2, Sparkles, Camera } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import type { Game, Player } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { AvatarCaptureDialog } from './avatar-capture-dialog';
import { useGames } from '@/context/game-context';
import { LegendaryPlayerCard } from './legendary-player-card';
import { generateLegendaryCard, GenerateLegendaryCardOutput } from '@/ai/flows/generate-legendary-card';

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

type LegendaryCardState = {
  loading: boolean;
  error: string | null;
  data: GenerateLegendaryCardOutput | null;
}

export function PlayerDetailsDialog({ open, onOpenChange, player }: PlayerDetailsDialogProps) {
  const { toast } = useToast();
  const { updatePlayer } = useGames();
  const [legendaryCardState, setLegendaryCardState] = useState<LegendaryCardState>({ loading: false, error: null, data: null });
  const [isCaptureOpen, setCaptureOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Conjuring epicness...');

  // Effect to populate the card state if the player already has legendary data
  useEffect(() => {
    if (open) { // Only run when the dialog is open
      if (player.legendaryTitle && player.legendaryBio) {
        setLegendaryCardState({
          loading: false,
          error: null,
          data: { title: player.legendaryTitle, bio: player.legendaryBio }
        });
      } else {
        // Reset when the dialog opens for a new player without a card
        setLegendaryCardState({ loading: false, error: null, data: null });
      }
    }
  }, [player, open]);

  const handleGenerateCard = async () => {
    setLegendaryCardState({ loading: true, error: null, data: null });
    
    let result: GenerateLegendaryCardOutput | null = null;
    let lastError: any = null;
    const retries = 3;
    let delayMs = 1000;

    for (let i = 0; i < retries; i++) {
        try {
            setLoadingMessage(`Conjuring epicness... (Attempt ${i + 1})`);
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
        // Update the local state first to show the card without closing the dialog
        setLegendaryCardState({ loading: false, error: null, data: result });
        
        // Then, update the persistent data in the background
        await updatePlayer(player.id, { 
            legendaryTitle: result.title, 
            legendaryBio: result.bio 
        });

        toast({
            title: "Legend Forged!",
            description: "The player's epic tale has been written."
        });
    } else {
        const errorMessage = 'The AI is very busy right now. Please try again in a minute.';
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
              
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Legendary Player Card</h3>
                  <Button size="sm" onClick={handleGenerateCard} disabled={legendaryCardState.loading}>
                    {legendaryCardState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {getButtonText()}
                  </Button>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
