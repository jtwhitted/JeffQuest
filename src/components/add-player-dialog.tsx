
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
import { Loader2, Camera } from 'lucide-react';
import React, { useState } from 'react';
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
import { AvatarCaptureDialog } from './avatar-capture-dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useGames } from '@/context/game-context';

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayerAdded: (player: Player) => void;
}

const formSchema = z.object({
    name: z.string().min(1, 'Player name is required.').max(50, 'Name must be 50 characters or less.'),
    avatarUrl: z.string().optional(),
});

export function AddPlayerDialog({ open, onOpenChange, onPlayerAdded }: AddPlayerDialogProps) {
  const { toast } = useToast();
  const [isCaptureDialogOpen, setCaptureDialogOpen] = useState(false);
  const { addPlayer } = useGames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: '',
        avatarUrl: '',
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const avatarUrl = form.watch('avatarUrl');

  const handleAvatarCaptured = (imageDataUrl: string) => {
    form.setValue('avatarUrl', imageDataUrl);
    setCaptureDialogOpen(false);
    toast({
      title: 'Avatar Captured!',
      description: 'A new photo has been set for the player.',
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const newPlayer = await addPlayer(values);
      onPlayerAdded(newPlayer);
      toast({
        title: 'Player Added!',
        description: `${newPlayer.name} has been added to the group.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error adding player:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the new player.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  }

  return (
    <>
      <AvatarCaptureDialog
        open={isCaptureDialogOpen}
        onOpenChange={setCaptureDialogOpen}
        onAvatarCaptured={handleAvatarCaptured}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                  <DialogHeader>
                      <DialogTitle>Add New Player</DialogTitle>
                      <DialogDescription>
                          Enter the player's name and optionally capture their avatar.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarUrl} alt="New player avatar" />
                            <AvatarFallback className="text-3xl">
                                {form.getValues('name')?.charAt(0) || <Camera />}
                            </AvatarFallback>
                        </Avatar>
                        <Button type="button" variant="outline" onClick={() => setCaptureDialogOpen(true)}>
                           <Camera className="mr-2 h-4 w-4" />
                           Take Photo
                        </Button>
                      </div>
                      <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel htmlFor="name" className="text-right">
                                  Name
                                  </FormLabel>
                                  <FormControl>
                                      <Input id="name" {...field} className="col-span-3" />
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
                          Save Player
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
