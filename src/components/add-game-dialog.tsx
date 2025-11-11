
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
import { GameScanDialog } from './game-scan-dialog';
import { Separator } from './ui/separator';
import { useGames } from '@/context/game-context';
import { ManualAddGameDialog } from './manual-add-game-dialog';
import { searchBggAction } from '@/lib/actions';
import { GameSearchResultsDialog } from './game-search-results-dialog';

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Game name is required.').max(100, 'Name must be 100 characters or less.'),
});

type SearchResult = { id: string; name: string };

export function AddGameDialog({ open, onOpenChange }: AddGameDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);
  const [isManualAddDialogOpen, setManualAddDialogOpen] = useState(false);
  const [manualAddDefaultName, setManualAddDefaultName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
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
  
  const handleSearchResults = (results: SearchResult[], query: string) => {
    setScanDialogOpen(false); // Close scan dialog if open
    if (results.length === 1) {
        addGame({ name: results[0].name, bggId: results[0].id }).then(() => {
            toast({
              title: 'Game Added!',
              description: `${results[0].name} has been added to your collection.`,
            });
            handleGameAdded();
        }).catch((error) => {
            toast({
              variant: 'destructive',
              title: 'Error Adding Game',
              description: error.message || 'Could not add the game.',
            });
        });
    } else if (results.length > 1) {
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
      handleSearchResults(results, values.name);
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
      <GameScanDialog
          open={isScanDialogOpen}
          onOpenChange={setScanDialogOpen}
          onScanComplete={handleSearchResults}
      />
      <ManualAddGameDialog
        open={isManualAddDialogOpen}
        onOpenChange={setManualAddDialogOpen}
        onGameAdded={handleGameAdded}
        initialName={manualAddDefaultName}
      />
      <GameSearchResultsDialog
        open={isSearchResultsOpen}
        onOpenChange={setSearchResultsOpen}
        results={searchResults}
        onGameSelected={handleGameAdded}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogDescription>
                  Scan a box, enter a name to search BGG, or add a game manually.
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
