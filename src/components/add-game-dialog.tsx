
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
import { Loader2, Scan } from 'lucide-react';
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
import type { GetGameTitleOutput } from '@/ai/flows/get-game-title-from-image';
import { Separator } from './ui/separator';
import { useGames } from '@/context/game-context';

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
  const { addGame } = useGames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });
  
  const handleNewGameScanned = (details: GetGameTitleOutput) => {
    form.setValue('name', details.title);
    toast({
        title: 'Game Title Populated!',
        description: 'The game title has been filled in. BGG data will be fetched upon saving.',
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // The addGame action will now handle fetching from BGG
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
        description: 'Could not add the new game. The BGG API might be down or the game not found.',
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
          onDetailsScanned={handleNewGameScanned}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogDescription>
                  Scan a game box to get the title, or enter details manually.
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
                    <FormControl>
                      <Input {...field} placeholder="e.g. Catan, Wingspan..."/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <p className="text-sm text-muted-foreground">Additional details (playtime, rating, etc.) will be fetched from BoardGameGeek when you save.</p>


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
