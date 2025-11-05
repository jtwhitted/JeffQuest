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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { GameScanDialog } from './game-scan-dialog';
import type { GetGameDetailsOutput } from '@/ai/flows/get-game-title-from-image';
import { Separator } from './ui/separator';
import { useGames } from '@/context/game-context';

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Game name is required.').max(100, 'Name must be 100 characters or less.'),
  category: z.string().min(1, 'Category is required.'),
  mechanics: z.array(z.string()).optional(),
  minPlayers: z.coerce.number().min(1, 'Must have at least 1 player.'),
  maxPlayers: z.coerce.number().min(1, 'Must have at least 1 player.'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  yearPublished: z.coerce.number().optional(),
  description: z.string().optional(),
  minPlaytime: z.coerce.number().optional(),
  maxPlaytime: z.coerce.number().optional(),
  rating: z.coerce.number().optional(),
  ratingCount: z.coerce.number().optional(),
  complexity: z.coerce.number().optional(),
  designers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
}).refine(data => data.maxPlayers >= data.minPlayers, {
    message: 'Max players must be greater than or equal to min players.',
    path: ['maxPlayers'],
});

export function AddGameDialog({ open, onOpenChange }: AddGameDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);
  const { addGame } = useGames();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: 'Strategy',
      mechanics: [],
      minPlayers: 1,
      maxPlayers: 4,
      difficulty: 'Intermediate',
      imageUrl: '',
    },
  });
  
  const handleNewGameScanned = (details: GetGameDetailsOutput) => {
    form.reset({
        ...details,
        // Ensure values that could be undefined are handled
        yearPublished: details.yearPublished || undefined,
        description: details.description || undefined,
        minPlaytime: details.minPlaytime || undefined,
        maxPlaytime: details.maxPlaytime || undefined,
        rating: details.rating || undefined,
        ratingCount: details.ratingCount || undefined,
        complexity: details.complexity || undefined,
        designers: details.designers || [],
        publishers: details.publishers || [],
        imageUrl: details.imageUrl || undefined,
    });
    toast({
        title: 'Game Details Populated!',
        description: 'The game details have been filled in. Review and save.',
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await addGame(values);
      toast({
        title: 'Game Added!',
        description: `${values.name} has been added to your collection.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error adding game:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the new game. Please try again.',
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
          onDetailsScanned={handleNewGameScanned}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogDescription>
                  Scan a game box to auto-fill the details, or enter them manually.
                </DialogDescription>
              </DialogHeader>

              <Button type="button" variant="outline" className="w-full" onClick={() => setScanDialogOpen(true)} disabled={isLoading}>
                    <Scan className="mr-2 h-4 w-4" />
                    Scan Box to Auto-Fill
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
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
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
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
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

               <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select difficulty..." />
                            </SelectTrigger>
                        </FormControl>
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

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>Cancel</Button>
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
