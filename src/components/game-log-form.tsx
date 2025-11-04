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
import { CalendarIcon, Loader2, Scan, UserPlus, Users } from 'lucide-react';
import { format } from 'date-fns';
import { GameScanDialog } from './game-scan-dialog';
import React, { useEffect, useState } from 'react';
import { AddPlayerDialog } from './add-player-dialog';
import type { GetGameDetailsOutput } from '@/ai/flows/get-game-title-from-image';
import { Switch } from './ui/switch';
import { Label } from "./ui/label"

const formSchema = z.object({
  gameId: z.string().min(1, 'Please select a game.'),
  date: z.date({ required_error: 'Please select a date.' }),
  playerIds: z.array(z.string()).min(1, 'Please select at least one player.'),
  isCooperative: z.boolean(),
  winnerId: z.string().optional(),
  cooperativeResult: z.enum(['win', 'loss']).optional(),
  scores: z.array(z.object({
      playerId: z.string(),
      score: z.coerce.number().optional(),
  })).optional(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.isCooperative) {
        return !!data.cooperativeResult;
    }
    // For competitive games, a winner is required if there are players selected
    if (data.playerIds.length > 0) {
        return !!data.winnerId;
    }
    return true;
}, {
    message: "A winner or a cooperative result must be selected.",
    path: ['winnerId'], // Show error on one of the fields
});

type FormValues = z.infer<typeof formSchema>;

interface GameLogFormProps {
  games: Game[];
  players: Player[];
}

export default function GameLogForm({ games: initialGames, players: initialPlayers }: GameLogFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);
  const [isAddPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [games, setGames] = useState(initialGames);
  const [players, setPlayers] = useState(initialPlayers);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      playerIds: [],
      isCooperative: false,
      scores: [],
      notes: '',
    },
  });

  const selectedPlayerIds = form.watch('playerIds');
  const scores = form.watch('scores');
  const isCooperative = form.watch('isCooperative');
  
  const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  // This effect synchronizes the scores array with the selected players
  useEffect(() => {
    const existingScores = form.getValues('scores') || [];
    const newScores = selectedPlayerIds.map(playerId => {
        const existing = existingScores.find(s => s.playerId === playerId);
        return existing || { playerId, score: undefined };
    });
    form.setValue('scores', newScores, { shouldValidate: true });
    
    // If a player is deselected, remove them from winner selection if they were the winner
    const winnerId = form.getValues('winnerId');
    if (winnerId && !selectedPlayerIds.includes(winnerId)) {
      form.setValue('winnerId', undefined);
    }
    
  // We only want to run this when selectedPlayerIds changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerIds.toString(), form.setValue]);


  // This effect automatically determines the winner from scores
  useEffect(() => {
    if (isCooperative) return;
  
    const validScores = scores?.filter(s => typeof s.score === 'number' && !isNaN(s.score));
  
    if (validScores && validScores.length > 0) {
      const winner = validScores.reduce((prev, current) => {
        return (prev.score! > current.score!) ? prev : current;
      });
  
      if (winner && winner.playerId) {
        form.setValue('winnerId', winner.playerId, { shouldValidate: true });
      }
    }
  }, [scores, isCooperative, form]);


  const handleNewGameScanned = async (details: GetGameDetailsOutput) => {
    try {
        const newGame = await addGame(details);
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

  const handlePlayerAdded = (newPlayer: Player) => {
    setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
    // Automatically select the new player
    const currentPlayerIds = form.getValues('playerIds');
    form.setValue('playerIds', [...currentPlayerIds, newPlayer.id]);
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
        onDetailsScanned={handleNewGameScanned}
    />
    <AddPlayerDialog
        open={isAddPlayerDialogOpen}
        onOpenChange={setAddPlayerDialogOpen}
        onPlayerAdded={handlePlayerAdded}
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
                <div className="flex items-center justify-between">
                    <FormLabel>Players</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAddPlayerDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Player
                    </Button>
                </div>
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
        
        <FormField
          control={form.control}
          name="isCooperative"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Cooperative Game?</FormLabel>
                <FormDescription>
                  Select if all players win or lose as a team.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      form.setValue('winnerId', undefined);
                    } else {
                      form.setValue('cooperativeResult', undefined);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {selectedPlayers.length > 0 && (
          isCooperative ? (
            <FormField
              control={form.control}
              name="cooperativeResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game Outcome</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select co-op result..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="win">All Players Won</SelectItem>
                      <SelectItem value="loss">All Players Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="winnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Winner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormDescription>
                    The winner is automatically selected if scores are entered.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )
        )}

        {selectedPlayers.length > 0 && (
            <Controller
                control={form.control}
                name="scores"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Scores (Optional)</FormLabel>
                        <div className="space-y-2">
                        {selectedPlayers.map((player, index) => (
                            <div key={player.id} className="flex items-center gap-4">
                                <Label htmlFor={`scores.${index}.score`} className="w-24 shrink-0">{player.name}</Label>
                                <Input 
                                    id={`scores.${index}.score`}
                                    type="number"
                                    placeholder="Enter score"
                                    value={field.value?.find(s => s.playerId === player.id)?.score ?? ''}
                                    onChange={(e) => {
                                        const newScores = [...(field.value || [])];
                                        const playerIndex = newScores.findIndex(s => s.playerId === player.id);
                                        const scoreValue = e.target.valueAsNumber;
                                        if (playerIndex > -1) {
                                            newScores[playerIndex] = { ...newScores[playerIndex], score: isNaN(scoreValue) ? undefined : scoreValue };
                                        } else {
                                            newScores.push({ playerId: player.id, score: isNaN(scoreValue) ? undefined : scoreValue });
                                        }
                                        field.onChange(newScores);
                                    }}
                                />
                            </div>
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

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !isClient}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Session
        </Button>
      </form>
    </Form>
    </>
  );
}

    