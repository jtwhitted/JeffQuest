
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Scan, FilePlus2 } from 'lucide-react';
import React, { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Separator } from './ui/separator';
import { searchBggAction, getBggDetailsAction } from '@/lib/actions';
import type { Game } from '@/lib/types';
import { useGames } from '@/context/game-context';
import { GameScanDialog } from './game-scan-dialog';
import { ManualAddGameDialog } from './manual-add-game-dialog';
import { GameSearchResultsDialog } from './game-search-results-dialog';


interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Game name is required.').max(100, 'Name must be 100 characters or less.'),
});


export function AddGameDialog({ open, onOpenChange }: AddGameDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);
  const [isManualAddDialogOpen, setManualAddDialogOpen] = useState(false);
  const [manualAddDefaultName, setManualAddDefaultName] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Game>[]>([]);
  const [isSearchResultsOpen, setSearchResultsOpen] = useState(false);
  const { addGame } = useGames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const handleGameAdded = () => {
    handleClose();
    setScanDialogOpen(false);
    setManualAddDialogOpen(false);
    setSearchResultsOpen(false);
  };

  const handleAddGameById = async (bggId: string, name: string) => {
    setIsSubmitting(true);
    try {
      const fullDetailsList = await getBggDetailsAction(bggId);
      if (fullDetailsList.length === 0 || !fullDetailsList[0].name) {
          throw new Error(`Could not fetch details for ${name} from BGG.`);
      }
      const gameDetails = fullDetailsList[0];

      await addGame({
          name: gameDetails.name!,
          bggId: gameDetails.id,
          description: gameDetails.description,
          yearPublished: gameDetails.yearPublished,
          minPlayers: gameDetails.minPlayers,
          maxPlayers: gameDetails.maxPlayers,
          minPlaytime: gameDetails.minPlaytime,
          maxPlaytime: gameDetails.maxPlaytime,
          difficulty: gameDetails.difficulty,
          category: gameDetails.category,
          mechanics: gameDetails.mechanics,
          designers: gameDetails.designers,
          publishers: gameDetails.publishers,
          imageUrl: gameDetails.imageUrl,
          rating: gameDetails.rating,
          ratingCount: gameDetails.ratingCount,
          complexity: gameDetails.complexity,
      });

      toast({
        title: 'Game Added!',
        description: `${name} has been added to your collection.`,
      });
      handleGameAdded();
    } catch (error: any) {
      console.error('Failed to add game by ID:', error);
      toast({
        variant: "destructive",
        title: "Error adding game",
        description: error.message || "Could not save the new game.",
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleScanComplete = (results: Partial<Game>[], query: string) => {
    setScanDialogOpen(false);
     if (results.length === 1 && results[0].id) {
        handleAddGameById(results[0].id, results[0].name || query);
        return;
    }
    if (results && results.length > 0) {
      setSearchResults(results);
      setSearchResultsOpen(true);
    } else {
        toast({
            variant: 'destructive',
            title: 'Game not found',
            description: `No match found for "${query}". Try adding it manually.`,
        });
        setManualAddDefaultName(query);
        setManualAddDialogOpen(true);
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const results = await searchBggAction(values.name);
      
      if (results && results.length > 0) {
        setSearchResults(results);
        setSearchResultsOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Game not found',
          description: `No match found for "${values.name}". Try adding it manually.`,
        });
        setManualAddDefaultName(values.name);
        setManualAddDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Error searching game:', error);
      toast({
        variant: 'destructive',
        title: 'Error Searching Game',
        description: error.message || 'Could not search for the game. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
      {isScanDialogOpen && (
        <GameScanDialog
            open={isScanDialogOpen}
            onOpenChange={setScanDialogOpen}
            onGameAdded={handleScanComplete}
        />
      )}
      {isManualAddDialogOpen && (
        <ManualAddGameDialog
          open={isManualAddDialogOpen}
          onOpenChange={setManualAddDialogOpen}
          onGameAdded={handleGameAdded}
          initialName={manualAddDefaultName}
        />
      )}
      {isSearchResultsOpen && (
        <GameSearchResultsDialog
          open={isSearchResultsOpen}
          onOpenChange={setSearchResultsOpen}
          results={searchResults}
          onGameSelected={(id, name) => handleAddGameById(id, name)}
        />
      )}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogDescription>
                  Scan a box, search BGG by name, or add a game manually.
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-2'>
                <Button type="button" variant="outline" className="w-full" onClick={() => setScanDialogOpen(true)} disabled={isSubmitting}>
                      <Scan className="mr-2 h-4 w-4" />
                      Scan Box to Add Game
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => { setManualAddDefaultName(''); setManualAddDialogOpen(true); }} disabled={isSubmitting}>
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      Add Game Manually
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search by Name (via BGG)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Catan, Wingspan..."/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Search BGG
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
