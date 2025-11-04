'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Game, Player } from '@/lib/types';
import { addSession, addGame } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Scan } from 'lucide-react';
import { format } from 'date-fns';
import { GameScanDialog } from './game-scan-dialog';
import React from 'react';

const formSchema = z.object({
  gameId: z.string().min(1, 'Please select a game.'),
  date: z.date({ required_error: 'Please select a date.' }),
  playerIds: z.array(z.string()).min(1, 'Please select at least one player.'),
  winnerId: z.string().min(1, 'Please select a winner.'),
  scores: z.array(z.object({
      playerId: z.string(),
      score: z.coerce.number().optional(),
  })).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GameLogFormProps {
  games: Game[];
  players: Player[];
}

export default function GameLogForm({ games: initialGames, players }: GameLogFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isScanDialogOpen, setScanDialogOpen] = React.useState(false);
  const [games, setGames] = React.useState(initialGames);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      playerIds: [],
      scores: [],
      notes: '',
    },
  });

  const selectedPlayerIds = form.watch('playerIds');
  const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  const handleNewGameScanned = async (title: string) => {
    try {
        const newGame = await addGame({ name: title });
        if (newGame) {
            setGames(prevGames => [...prevGames, newGame]);
            form.setValue('gameId', newGame.id);
            toast({
                title: 'Game Added!',
                description: `${newGame.name} has been added to your collection.`,
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error adding game",
            description: "Could not save the new game.",
        });
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
        await addSession(values);
        toast({
            title: "Session Logged!",
            description: "Your new game session has been saved.",
        });
        router.push('/sessions');
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to log session. Please try again.",
        });
    }
  };

  return (
    <>
    <GameScanDialog
        open={isScanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onTitleScanned={handleNewGameScanned}
    />
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="gameId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Game Played</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => setScanDialogOpen(true)}>
                    <Scan className="mr-2 h-4 w-4" />
                    Scan Game Box
                </Button>
              </div>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="playerIds"
          render={() => (
            <FormItem>
              <FormLabel>Players</FormLabel>
              <div className="space-y-2 rounded-md border p-4">
              {players.map((player) => (
                <FormField
                  key={player.id}
                  control={form.control}
                  name="playerIds"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={player.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(player.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, player.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== player.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {player.name}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedPlayers.length > 0 && (
             <FormField
                control={form.control}
                name="winnerId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Winner</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select the winner..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {selectedPlayers.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                            {player.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        {selectedPlayers.length > 0 && (
            <Controller
                control={form.control}
                name="scores"
                render={() => (
                    <FormItem>
                        <FormLabel>Scores (Optional)</FormLabel>
                        <div className="space-y-2">
                        {selectedPlayers.map((player, index) => (
                             <FormField
                                key={player.id}
                                control={form.control}
                                name={`scores.${index}`}
                                render={() => (
                                    <FormItem className="flex items-center gap-4">
                                        <FormLabel className="w-24 shrink-0">{player.name}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                placeholder="Enter score"
                                                {...form.register(`scores.${index}.score`)}
                                                onChange={(e) => {
                                                    form.setValue(`scores.${index}.playerId`, player.id);
                                                    form.setValue(`scores.${index}.score`, e.target.valueAsNumber);
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                             />
                        ))}
                        </div>
                    </FormItem>
                )}
            />
        )}

        <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                    <Textarea
                        placeholder="Any memorable moments, strategies, or house rules?"
                        {...field}
                    />
                </FormControl>
                <FormDescription>
                    These notes can be used by the AI to generate summaries.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Session
        </Button>
      </form>
    </Form>
    </>
  );
}
