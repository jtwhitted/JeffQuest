
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
import React, { useState } from 'react';
import type { Game, Player } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Accordion } from './ui/accordion';
import { AvatarCaptureDialog } from './avatar-capture-dialog';
import { useGames } from '@/context/game-context';
import { LegendaryPlayerCard } from './legendary-player-card';
import { generateLegendaryCard } from '@/ai/flows/generate-legendary-card';

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
  title: string | null;
  stylizedAvatarDataUri: string | null;
}

// Helper to convert image URL to data URI, handling potential CORS issues
async function toDataUri(url: string): Promise<string> {
    // Check if the URL is already a data URI
    if (url.startsWith('data:')) {
        return url;
    }
  
    // Use a simple proxy for external images to avoid CORS issues in the browser
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}`);
    }
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
  const [legendaryCardState, setLegendaryCardState] = useState<LegendaryCardState>({ loading: false, error: null, title: null, stylizedAvatarDataUri: null });
  const [isCaptureOpen, setCaptureOpen] = useState(false);
  const { updatePlayer } = useGames();

  const handleGenerateCard = async () => {
    if (legendaryCardState.stylizedAvatarDataUri && !legendaryCardState.error) return; 

    setLegendaryCardState({ loading: true, error: null, title: null, stylizedAvatarDataUri: null });
    try {
        const avatarDataUri = await toDataUri(player.avatarUrl);

        const result = await generateLegendaryCard({
            name: player.name,
            avatarDataUri,
            gamesPlayed: player.gamesPlayed,
            wins: player.wins,
            winRate: player.winRate,
            favoriteGame: player.favoriteGame?.name,
        });
      setLegendaryCardState({ loading: false, error: null, ...result });
    } catch (error: any) {
      console.error('Error generating legendary card:', error);
      let errorMessage = 'Could not generate card. Please try again.';
      if (typeof error.message === 'string' && error.message.includes('429')) {
        errorMessage = 'The AI is a bit busy right now. Please wait a minute and try again.';
      }
      setLegendaryCardState({ loading: false, error: errorMessage, title: null, stylizedAvatarDataUri: null });
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
      // Invalidate the generated card since the avatar has changed
      setLegendaryCardState({ loading: false, error: null, title: null, stylizedAvatarDataUri: null });
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
    setLegendaryCardState({ loading: false, error: null, title: null, stylizedAvatarDataUri: null });
    onOpenChange(false);
  }
  
  const getButtonText = () => {
    if(legendaryCardState.loading) return 'Summoning Legend...';
    if(legendaryCardState.stylizedAvatarDataUri) return 'Card Generated!';
    if(legendaryCardState.error) return 'Try Again';
    return 'Generate Legendary Card';
  }

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
                                <p className="mt-2 text-sm text-muted-foreground">Conjuring epicness...</p>
                            </div>
                        )}
                        {!legendaryCardState.loading && !legendaryCardState.stylizedAvatarDataUri && !legendaryCardState.error && (
                            <p className="text-sm text-muted-foreground text-center">Click the button to forge this player into a legend!</p>
                        )}
                        {legendaryCardState.error && <p className="text-sm text-destructive text-center">{legendaryCardState.error}</p>}
                        {legendaryCardState.stylizedAvatarDataUri && legendaryCardState.title && (
                            <LegendaryPlayerCard 
                                name={player.name}
                                title={legendaryCardState.title}
                                stylizedAvatarDataUri={legendaryCardState.stylizedAvatarDataUri}
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
