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
import { Loader2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import type { Player } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { generatePlayerBio } from '@/ai/flows/generate-player-bio';
import { Card, CardContent } from './ui/card';

interface PlayerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player & { gamesPlayed: number; wins: number; winRate: number };
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

        <div className="py-4">
            <div className="text-sm">
                <div className="flex justify-between mb-1">
                    <span className="font-medium">Win Rate</span>
                    <span className="text-muted-foreground">{player.winRate}%</span>
                </div>
                <Progress value={player.winRate} aria-label={`${player.winRate}% win rate`} />
            </div>

            <div className="mt-6">
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

      </DialogContent>
    </Dialog>
  );
}
