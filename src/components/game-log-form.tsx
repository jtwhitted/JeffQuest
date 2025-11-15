
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
import type { Player, Game } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Scan, UserPlus, Mic, Square, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { GameScanDialog } from './game-scan-dialog';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AddPlayerDialog } from './add-player-dialog';
import { Switch } from './ui/switch';
import { Label } from "./ui/label"
import { useGames } from '@/context/game-context';
import { GameSearchResultsDialog } from './game-search-results-dialog';
import { ManualAddGameDialog } from './manual-add-game-dialog';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { extractSessionDetails, type ExtractSessionDetailsOutput } from '@/ai/flows/extract-session-details';

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
  duration: z.coerce.number().optional(),
}).refine(data => {
    // If competitive and players are selected, a winner must be chosen.
    if (!data.isCooperative && data.playerIds.length > 0) {
        return !!data.winnerId;
    }
    return true;
}, {
    message: "Please select a winner for the game.",
    path: ['winnerId'], 
}).refine(data => {
    // If cooperative and players are selected, a result must be chosen.
    if (data.isCooperative && data.playerIds.length > 0) {
        return !!data.cooperativeResult;
    }
    return true;
}, {
    message: "Please select the outcome for the cooperative game.",
    path: ['cooperativeResult'],
});

type FormValues = z.infer<typeof formSchema>;

export default function GameLogForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isScanDialogOpen, setScanDialogOpen] = useState(false);
  const [isManualAddDialogOpen, setManualAddDialogOpen] = useState(false);
  const [isSearchResultsOpen, setSearchResultsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [manualAddDefaultName, setManualAddDefaultName] = useState('');
  const [isAddPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const { games, players, addGame, addSession } = useGames();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerIds: [],
    },
  });
  
  // Set default form values on the client to avoid hydration errors
  useEffect(() => {
    form.reset({
      date: new Date(),
      playerIds: [],
      isCooperative: false,
      scores: [],
      notes: '',
      duration: undefined,
    });
  }, [form]);


  const selectedPlayerIds = form.watch('playerIds');
  const scores = form.watch('scores');
  const isCooperative = form.watch('isCooperative');
  const gameId = form.watch('gameId');

  useEffect(() => {
    if (!gameId) return;
    const selectedGame = games.find(g => g.id === gameId);
    const isCoopGame = selectedGame?.mechanics?.includes('Cooperative Game') || false;
    form.setValue('isCooperative', isCoopGame, { shouldValidate: true });
  }, [gameId, games, form]);
  
  const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  // This effect synchronizes the scores array with the selected players
  useEffect(() => {
    const existingScores = form.getValues('scores') || [];
    const newScores = selectedPlayerIds.map(playerId => {
        const existing = existingScores.find(s => s.playerId === playerId);
        return existing || { playerId, score: undefined };
    });
    form.setValue('scores', newScores, { shouldValidate: true });
    
    const winnerId = form.getValues('winnerId');
    if (winnerId && !selectedPlayerIds.includes(winnerId)) {
      form.setValue('winnerId', undefined);
    }
    
  }, [selectedPlayerIds, form]);


  // This effect automatically determines the winner from scores
  useEffect(() => {
    if (isCooperative || !scores) return;
  
    const validScores = scores.filter(s => typeof s.score === 'number' && !isNaN(s.score));
  
    if (validScores.length > 0 && validScores.length === selectedPlayerIds.length) {
      const winner = validScores.reduce((prev, current) => {
        return (prev.score! > current.score!) ? prev : current;
      });
  
      if (winner?.playerId) {
        form.setValue('winnerId', winner.playerId, { shouldValidate: true });
      }
    }
  }, [scores, isCooperative, form, selectedPlayerIds.length]);


  const handleScanComplete = async (results: {id: string, name: string}[], query: string) => {
    setScanDialogOpen(false);
    if (results.length === 1) {
        await handleAddGameById(results[0].id, results[0].name);
    } else if (results.length > 1) {
        setSearchResults(results);
        setSearchResultsOpen(true);
    } else {
        toast({
            variant: 'destructive',
            title: 'Game not found',
            description: `No match found for "${query}". Try adding it manually.`,
        });
        setManualAddDefaultName(query);
        setManualAddDialogOpen(true);
    }
  };

  const handleAddGameById = async (bggId: string, name: string) => {
    try {
      const newGame = await addGame({ bggId, name });
      if (newGame) {
        form.setValue('gameId', newGame.id, { shouldValidate: true });
        toast({
          title: 'Game Added!',
          description: `${newGame.name} has been added and selected.`,
        });
        setSearchResultsOpen(false);
      } else {
        throw new Error('Failed to fetch details from BGG.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding game",
        description: error.message || "Could not save the new game.",
      });
    }
  };

  const handleManualGameAdded = (newGame: Game) => {
    form.setValue('gameId', newGame.id);
    setManualAddDialogOpen(false);
  }

  const handlePlayerAdded = (newPlayer: Player) => {
    // Automatically select the new player
    const currentPlayerIds = form.getValues('playerIds');
    form.setValue('playerIds', [...currentPlayerIds, newPlayer.id]);
  };
  
  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop()); // Stop mic indicator immediately
          
          setIsProcessing(true);
          setProcessingMessage('Transcribing...');

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            if (base64Audio) {
              try {
                const { text: newText } = await transcribeAudio({ audioDataUri: base64Audio });
                
                const currentNotes = form.getValues('notes') || '';
                const combinedNotes = currentNotes ? `${currentNotes} ${newText}` : newText;
                
                form.setValue('notes', combinedNotes);
                toast({ title: 'Transcription Appended' });
                
                setProcessingMessage('Extracting details...');
                await handleExtractDetails(combinedNotes);

              } catch (error: any) {
                console.error('Transcription or Extraction error:', error);
                toast({ variant: 'destructive', title: 'Processing Failed', description: error.message });
              } finally {
                setIsProcessing(false);
                setProcessingMessage('');
              }
            }
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        toast({ variant: 'destructive', title: 'Microphone Error', description: 'Could not access the microphone.' });
      }
    }
  };

  async function extractDetailsWithRetry(transcription: string, retries = 3, delayMs = 1000): Promise<ExtractSessionDetailsOutput | undefined> {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await extractSessionDetails({ transcription });
        return result; // Success
      } catch (e: any) {
        if (i === retries - 1) {
          throw e; // Last retry failed, throw error
        }
        console.log(`Extraction failed, retrying in ${delayMs / 1000}s... (Attempt ${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }

  const handleExtractDetails = async (transcription: string) => {
    if (!transcription) return;

    try {
        const result = await extractDetailsWithRetry(transcription);

        if (!result) {
            throw new Error("The AI failed to extract any details from the transcription.");
        }

        if (result.gameId) form.setValue('gameId', result.gameId, { shouldValidate: true });
        if (result.date) {
            // The AI returns a string like 'YYYY-MM-DD'. We need to parse it correctly,
            // accounting for timezone to avoid off-by-one day errors.
            const date = parseISO(result.date);
            form.setValue('date', date, { shouldValidate: true });
        }
        if (result.playerIds && result.playerIds.length > 0) form.setValue('playerIds', result.playerIds, { shouldValidate: true });
        if (result.isCooperative !== undefined) form.setValue('isCooperative', result.isCooperative, { shouldValidate: true });
        if (result.durationInMinutes) form.setValue('duration', result.durationInMinutes, { shouldValidate: true });
        if (result.isCooperative) {
            if (result.cooperativeResult) form.setValue('cooperativeResult', result.cooperativeResult, { shouldValidate: true });
        } else {
            if (result.winnerId) form.setValue('winnerId', result.winnerId, { shouldValidate: true });
        }
        
        if (result.scores && result.scores.length > 0) {
            const finalPlayerIds = result.playerIds && result.playerIds.length > 0 ? result.playerIds : form.getValues('playerIds');
            
            const newScores = finalPlayerIds.map(pid => {
                const foundScore = result.scores?.find(s => s.playerId === pid);
                return { playerId: pid, score: foundScore ? foundScore.score : undefined };
            });

            form.setValue('scores', newScores, { shouldValidate: true });
        }
        
        toast({ title: 'Details Extracted!', description: 'The form has been populated with details from your session.' });

    } catch(e: any) {
        console.error('Error extracting details:', e);
        toast({ variant: 'destructive', title: 'Extraction Failed', description: e.message || 'Could not extract details from the transcription.' });
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

  const getButtonState = () => {
    if (isRecording) return { text: 'Stop Recording', icon: Square, variant: 'destructive' as const, disabled: false };
    if (isProcessing) return { text: processingMessage, icon: Loader2, variant: 'outline' as const, disabled: true };
    return { text: 'Record Session', icon: Mic, variant: 'outline' as const, disabled: false };
  }

  const buttonState = getButtonState();

  return (
    <>
    <GameScanDialog
        open={isScanDialogOpen}
        onOpenChange={setScanDialogOpen}
        onGameAdded={handleScanComplete}
    />
     <ManualAddGameDialog
        open={isManualAddDialogOpen}
        onOpenChange={setManualAddDialogOpen}
        onGameAdded={handleManualGameAdded}
        initialName={manualAddDefaultName}
      />
    <GameSearchResultsDialog
        open={isSearchResultsOpen}
        onOpenChange={setSearchResultsOpen}
        results={searchResults}
        onGameSelected={(id, name) => handleAddGameById(id, name)}
    />
    <AddPlayerDialog
        open={isAddPlayerDialogOpen}
        onOpenChange={setAddPlayerDialogOpen}
        onPlayerAdded={handlePlayerAdded}
    />
    <Form {...form}>
      <div className="mb-6">
        <Button
            type="button"
            variant={buttonState.variant}
            className="w-full"
            onClick={handleToggleRecording}
            disabled={buttonState.disabled}
        >
            <buttonState.icon className={cn("mr-2 h-4 w-4", isProcessing && "animate-spin")} />
            {buttonState.text}
        </Button>
        <FormDescription className="text-center mt-2">
            Record a summary of your game and let AI fill in the details.
        </FormDescription>
      </div>
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
                    Scan/Add Game
                </Button>
              </div>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sortedGames.map((game) => (
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
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
                name="duration"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Game Duration (minutes)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 90" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>


        <FormField
          control={form.control}
          name="playerIds"
          render={() => (
            <FormItem>
                <div className="flex items-center justify-between">
                    <FormLabel>Players</FormLabel>
                    <div className='flex items-center gap-2'>
                       <Button type="button" variant="outline" size="sm" onClick={() => setAddPlayerDialogOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Player
                        </Button>
                    </div>
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
                                ? field.onChange([...(field.value || []), player.id])
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
                    <div className="flex items-center justify-between mb-2">
                        <FormLabel>Notes</FormLabel>
                    </div>
                <FormControl>
                    <Textarea
                        placeholder="Your transcribed session notes will appear here."
                        {...field}
                    />
                </FormControl>
                <FormDescription>
                    You can manually edit these notes before logging the session.
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

    
