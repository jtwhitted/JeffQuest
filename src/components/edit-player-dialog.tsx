
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
import { Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import type { Player } from '@/lib/types';
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
import { useGames } from '@/context/game-context';

interface EditPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player;
}

const formSchema = z.object({
    name: z.string().min(1, 'Player name is required.').max(50, 'Name must be 50 characters or less.'),
    bggUsername: z.string().optional(),
});

export function EditPlayerDialog({ open, onOpenChange, player }: EditPlayerDialogProps) {
  const { toast } = useToast();
  const { updatePlayer } = useGames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    if (player) {
      form.reset({
        name: player.name,
        bggUsername: player.bggUsername || '',
      });
    }
  }, [player, form, open]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await updatePlayer(player.id, {
        name: values.name,
        bggUsername: values.bggUsername || undefined,
      });
      toast({
        title: 'Player Updated!',
        description: `${values.name}'s details have been saved.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update the player details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
  }

  return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                  <DialogHeader>
                      <DialogTitle>Edit Player</DialogTitle>
                      <DialogDescription>
                          Update the player's name and BoardGameGeek username.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                      <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="bggUsername"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>BGG Username (Optional)</FormLabel>
                                  <FormControl>
                                      <Input placeholder="e.g. BoardGameGeek" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}
