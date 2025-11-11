
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
  const { addGame } = useGames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const handleGameAdded = () => {
    setScanDialogOpen(false);
    setManualAddDialogOpen(false);
    handleClose();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const newGame = await addGame({ name: values.name });
      toast({
        title: 'Game Added!',
        description: `${newGame.name} has been added to your collection.`,
      });
      handleClose();
    } catch (error: any) {
      console.error('Error adding game:', error);
      toast({
        variant: 'destructive',
        title: 'Error Adding Game',
        description: error.message || 'Could not add the new game. Please check the name and try again.',
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
          onGameAdded={handleGameAdded}
      />
      <ManualAddGameDialog
        open={isManualAddDialogOpen}
        onOpenChange={setManualAddDialogOpen}
        onGameAdded={handleGameAdded}
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
                <Button type="button" variant="outline" className="w-full" onClick={() => setManualAddDialogOpen(true)} disabled={isSubmitting}>
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
                  Search and Add Game
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
