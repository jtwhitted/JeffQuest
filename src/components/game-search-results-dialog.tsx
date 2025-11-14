
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Game } from '@/lib/types';
import { addGame } from '@/lib/actions';

interface GameSearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: Partial<Game>[];
  onGameSelected: () => void;
}

export function GameSearchResultsDialog({ open, onOpenChange, results, onGameSelected }: GameSearchResultsDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedValue) {
      toast({
        variant: 'destructive',
        title: 'No game selected',
        description: 'Please select a game from the list to add.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const selectedGame = results.find(r => r.id === selectedValue);
      if (!selectedGame || !selectedGame.id || !selectedGame.name) throw new Error('Selected game not found.');
      
      // Directly call the server action to add the game by its BGG ID
      await addGame({ name: selectedGame.name, bggId: selectedGame.id });

      toast({
        title: 'Game Added!',
        description: `${selectedGame.name} has been added to your collection.`,
      });
      onGameSelected();
    } catch (error: any) {
      console.error('Error adding selected game:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not add the selected game.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedValue(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a Game</DialogTitle>
          <DialogDescription>
            We found a few possible matches on BoardGameGeek. Please choose the correct one.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64">
          <RadioGroup value={selectedValue || ''} onValueChange={setSelectedValue} className="p-1">
            {results.map(result => (
              <div key={result.id} className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50">
                <RadioGroupItem value={result.id!} id={result.id!} />
                <Label htmlFor={result.id!} className="flex-1 cursor-pointer">
                  {result.name} {result.yearPublished && `(${result.yearPublished})`}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedValue || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Selected Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
