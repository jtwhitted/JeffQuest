
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
import { Loader2, Scan, Search } from 'lucide-react';
import React, { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { GameScanDialog } from './game-scan-dialog';
import type { GetGameTitleOutput } from '@/ai/flows/get-game-title-from-image';
import { Separator } from './ui/separator';
import { useGames } from '@/context/game-context';
import { searchBggAction } from '@/lib/actions';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Game name is required.').max(100, 'Name must be 100 characters or less.'),
  bggId: z.string().optional(),
});

type BggSearchResult = { id: string; name: string };

export function AddGameDialog({ open, onOpenChange }: AddGameDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);
  const { addGame } = useGames();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BggSearchResult[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bggId: '',
    },
  });

  const handleSearch = async () => {
    const query = form.getValues('name');
    if (!query) {
      toast({
        variant: 'destructive',
        title: 'Search Error',
        description: 'Please enter a game name to search.',
      });
      return;
    }
    setIsSearching(true);
    setSearchResults([]);
    form.setValue('bggId', '');
    try {
      const results = await searchBggAction(query);
      if (results.length === 0) {
        toast({
          title: 'No Results',
          description: `No games found on BGG for "${query}". You can still add it manually.`,
        });
      }
      setSearchResults(results);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: 'Could not connect to BoardGameGeek. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleNewGameScanned = (details: GetGameTitleOutput) => {
    form.setValue('name', details.title);
    toast({
        title: 'Game Title Populated!',
        description: 'Now searching BGG for matching games...',
    });
    // Automatically trigger search after scan
    handleSearch();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const newGame = await addGame(values);
      toast({
        title: 'Game Added!',
        description: `${newGame.name} has been added to your collection.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error adding game:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the new game. If providing a BGG ID, ensure it is correct.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSearchResults([]);
    onOpenChange(false);
  };

  return (
    <>
      <GameScanDialog
          open={isScanDialogOpen}
          onOpenChange={setScanDialogOpen}
          onDetailsScanned={handleNewGameScanned}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogDescription>
                  Scan, search, or manually enter a game. Searching BGG will autofill details.
                </DialogDescription>
              </DialogHeader>

              <Button type="button" variant="outline" className="w-full" onClick={() => setScanDialogOpen(true)} disabled={isSubmitting}>
                    <Scan className="mr-2 h-4 w-4" />
                    Scan Box to Get Title
              </Button>
              
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
                    <FormLabel>Game Name</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="e.g. Catan, Wingspan..."/>
                      </FormControl>
                      <Button type="button" size="icon" variant="outline" onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                        <span className="sr-only">Search</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {searchResults.length > 0 && (
                <FormField
                  control={form.control}
                  name="bggId"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Select the correct game from BGG</FormLabel>
                      <FormControl>
                        <ScrollArea className="h-48">
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedGame = searchResults.find(r => r.id === value);
                            if (selectedGame) {
                                form.setValue('name', selectedGame.name, { shouldValidate: true });
                            }
                          }}
                          defaultValue={field.value}
                          className="space-y-1"
                        >
                          {searchResults.map(result => (
                            <FormItem key={result.id} className="flex items-center space-x-3 space-y-0 rounded-md border p-3">
                              <FormControl>
                                <RadioGroupItem value={result.id} />
                              </FormControl>
                              <FormLabel className="font-normal w-full cursor-pointer">
                                {result.name}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                        </ScrollArea>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Game
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
