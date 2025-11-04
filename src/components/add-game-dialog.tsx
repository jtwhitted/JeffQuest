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
import { addGame } from '@/lib/actions';
import type { Game } from '@/lib/types';
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

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameAdded: (game: Game) => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Game name is required.').max(100, 'Name must be 100 characters or less.'),
});

export function AddGameDialog({ open, onOpenChange, onGameAdded }: AddGameDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });
  
  const handleNewGameScanned = async (title: string) => {
    form.setValue('name', title);
    // You could even submit the form directly if you want
    toast({
        title: 'Game Title Scanned!',
        description: 'The game name has been filled in. Click "Save Game" to add it.',
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const newGame = await addGame({ name: values.name });
      if (newGame) {
        onGameAdded(newGame);
        toast({
          title: 'Game Added!',
          description: `${newGame.name} has been added to your collection.`,
        });
        handleClose();
      } else {
        throw new Error('Failed to create game.');
      }
    } catch (error) {
      console.error('Error adding game:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the new game.',
      });
    } finally {
      setIsLoading(false);
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
          onTitleScanned={handleNewGameScanned}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogDescription>
                  Enter the name of the new game or scan the box.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name" className="text-right">
                        Game Name
                      </FormLabel>
                      <FormControl>
                        <Input id="name" {...field} className="col-span-3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="grid grid-cols-2 gap-2">
                 <Button type="button" variant="outline" onClick={() => setScanDialogOpen(true)} disabled={isLoading}>
                    <Scan className="mr-2 h-4 w-4" />
                    Scan Box
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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