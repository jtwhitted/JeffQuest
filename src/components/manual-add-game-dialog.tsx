
'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useGames } from '@/context/game-context';
import { Loader2, Camera, Dices } from 'lucide-react';
import { AvatarCaptureDialog } from './avatar-capture-dialog';
import Image from 'next/image';

interface ManualAddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameAdded: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Game name is required'),
  description: z.string().min(1, 'Description is required'),
  imageUrl: z.string().optional(),
  yearPublished: z.coerce.number().optional(),
  minPlayers: z.coerce.number().min(1, 'Must have at least 1 player'),
  maxPlayers: z.coerce.number().min(1, 'Must have at least 1 player'),
  minPlaytime: z.coerce.number().optional(),
  maxPlaytime: z.coerce.number().optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  category: z.string().optional(),
  mechanics: z.string().optional(),
  designers: z.string().optional(),
  publishers: z.string().optional(),
});

export function ManualAddGameDialog({ open, onOpenChange, onGameAdded }: ManualAddGameDialogProps) {
  const { toast } = useToast();
  const { addGame } = useGames();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCaptureOpen, setCaptureOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      minPlayers: 1,
      maxPlayers: 4,
      difficulty: 'Intermediate',
    },
  });

  const imageUrl = form.watch('imageUrl');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Convert comma-separated strings to arrays
      const gameData = {
        ...values,
        category: values.category?.split(',').map(s => s.trim()).filter(Boolean) || [],
        mechanics: values.mechanics?.split(',').map(s => s.trim()).filter(Boolean) || [],
        designers: values.designers?.split(',').map(s => s.trim()).filter(Boolean) || [],
        publishers: values.publishers?.split(',').map(s => s.trim()).filter(Boolean) || [],
      };

      await addGame(gameData);
      toast({
        title: 'Game Manually Added!',
        description: `${values.name} has been added to your collection.`,
      });
      onGameAdded();
      handleClose();
    } catch (error) {
      console.error('Error manually adding game:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the game. Please check the details and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleImageCaptured = (dataUrl: string) => {
    form.setValue('imageUrl', dataUrl);
    setCaptureOpen(false);
  };

  return (
    <>
      <AvatarCaptureDialog
        open={isCaptureOpen}
        onOpenChange={setCaptureOpen}
        onAvatarCaptured={handleImageCaptured}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a Game Manually</DialogTitle>
            <DialogDescription>
              Enter the details for a game not found on BoardGameGeek.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="h-[60vh] pr-6">
                <div className="space-y-4 py-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative h-40 w-40 rounded-lg border bg-muted flex items-center justify-center">
                      {imageUrl ? (
                        <Image src={imageUrl} alt="Game box art" layout="fill" className="object-cover rounded-lg" />
                      ) : (
                        <Dices className="h-16 w-16 text-muted-foreground" />
                      )}
                    </div>
                    <Button type="button" variant="outline" onClick={() => setCaptureOpen(true)}>
                      <Camera className="mr-2 h-4 w-4" />
                      Take Box Art Photo
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea {...field} rows={4} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minPlayers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Players</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxPlayers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Players</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minPlaytime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Playtime (mins)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxPlaytime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Playtime (mins)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="yearPublished"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Published</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                            <SelectItem value="Expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categories</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Economic, Negotiation" /></FormControl>
                        <FormDescription>Comma-separated values.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mechanics"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mechanics</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Dice Rolling, Hand Management" /></FormControl>
                        <FormDescription>Comma-separated values.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                   <FormField
                    control={form.control}
                    name="designers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designers</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Klaus Teuber" /></FormControl>
                         <FormDescription>Comma-separated values.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                   <FormField
                    control={form.control}
                    name="publishers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publishers</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. KOSMOS" /></FormControl>
                         <FormDescription>Comma-separated values.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
              </ScrollArea>
              <DialogFooter className="pt-6">
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
