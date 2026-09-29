
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useGames } from '@/context/game-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { WandSparkles, Loader2, UserPlus, Mic, Square } from 'lucide-react';
import type { Game, Player } from '@/lib/types';
import { suggestGameNightAction } from '@/lib/actions';
import Image from 'next/image';
import Link from 'next/link';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { Textarea } from '@/components/ui/textarea';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Recommendation {
    game: Game;
    reason: string;
}

export default function PlannerPage() {
    const { players, games, isLoading: isDataLoading, refreshData } = useGames();
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [availableTime, setAvailableTime] = useState<string>('');
    const [mood, setMood] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isAddPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);

    const { toast } = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handlePlayerChange = (playerId: string, checked: boolean) => {
        setSelectedPlayerIds(prev =>
            checked ? [...prev, playerId] : prev.filter(id => id !== playerId)
        );
    };

    const handlePlayerAdded = async () => {
        await refreshData();
        setAddPlayerDialogOpen(false);
    }
    
    const handleSuggestGames = async () => {
        setIsGenerating(true);
        setRecommendations([]);
        try {
            const result = await suggestGameNightAction({
                playerIds: selectedPlayerIds,
                availableTime: availableTime ? parseInt(availableTime, 10) : undefined,
                mood: mood || undefined,
            });
            
            const populatedRecommendations = result.recommendations.map(rec => {
                const game = games.find(g => g.id === rec.gameId);
                return { game: game!, reason: rec.reason };
            }).filter(rec => rec.game); // Filter out any games not found

            setRecommendations(populatedRecommendations);
            
        } catch (error: any) {
            console.error('Failed to get suggestions', error);
            toast({
                variant: 'destructive',
                title: 'Suggestion Failed',
                description: error.message,
            });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
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
                    stream.getTracks().forEach(track => track.stop());
                    
                    setIsProcessing(true);

                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result as string;
                        if (base64Audio) {
                            try {
                                const { text } = await transcribeAudio({ 
                                    audioDataUri: base64Audio,
                                    prompt: "The user is describing the 'vibe' or mood for a game night. Transcribe their spoken words literally and exactly. Do not summarize or leave any words out. The audio is in English."
                                });
                                setMood(text);
                                toast({ title: 'Vibe transcribed!' });
                            } catch (error: any) {
                                console.error('Transcription error:', error);
                                toast({ variant: 'destructive', title: 'Transcription Failed', description: error.message });
                            } finally {
                                setIsProcessing(false);
                                setIsRecording(false);
                            }
                        }
                    };
                };
                
                setTimeout(() => {
                    if (mediaRecorderRef.current?.state === 'inactive') {
                        mediaRecorderRef.current?.start();
                        setIsRecording(true);
                    }
                }, 300); // 300ms delay to allow microphone to initialize

            } catch (err) {
                console.error('Error accessing microphone:', err);
                toast({ variant: 'destructive', title: 'Microphone Error', description: 'Could not access the microphone.' });
            }
        }
    };


    return (
        <>
            {isAddPlayerDialogOpen && (
                <AddPlayerDialog
                    open={isAddPlayerDialogOpen}
                    onOpenChange={setAddPlayerDialogOpen}
                    onPlayerAdded={handlePlayerAdded}
                />
            )}
            <div className="space-y-8">
                <PageHeader
                    title="Game Night Planner"
                    description="Get AI-powered recommendations for your next game night."
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Who, How Long & What Vibe?</CardTitle>
                            <CardDescription>Select who's playing and your preferences.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Players Present</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAddPlayerDialogOpen(true)}
                                    >
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Add Player
                                    </Button>
                                </div>
                                <div className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
                                    {players.map(player => (
                                        <div key={player.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`player-${player.id}`}
                                                checked={selectedPlayerIds.includes(player.id)}
                                                onCheckedChange={(checked) => handlePlayerChange(player.id, !!checked)}
                                            />
                                            <Label htmlFor={`player-${player.id}`} className="font-normal">{player.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="time">Available Time (optional)</Label>
                                <Input
                                    id="time"
                                    type="number"
                                    placeholder="e.g., 90 minutes"
                                    value={availableTime}
                                    onChange={e => setAvailableTime(e.target.value)}
                                    min="0"
                                />
                            </div>

                             <div className="space-y-2">
                                <Label htmlFor="mood">What's the vibe? (optional)</Label>
                                 <div className="relative">
                                    <Textarea
                                        id="mood"
                                        placeholder="e.g., 'Something light and cooperative', 'A competitive strategy game...'"
                                        value={mood}
                                        onChange={e => setMood(e.target.value)}
                                        rows={3}
                                        className="pr-12"
                                    />
                                    <Button
                                        type="button"
                                        variant={isRecording ? "destructive" : "outline"}
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                        onClick={handleToggleRecording}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />)}
                                        <span className="sr-only">{isRecording ? 'Stop Recording' : 'Record Vibe'}</span>
                                    </Button>
                                </div>
                            </div>
                            
                            <Button 
                                className="w-full" 
                                onClick={handleSuggestGames}
                                disabled={isGenerating || selectedPlayerIds.length === 0}
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                                {isGenerating ? 'Thinking...' : 'Suggest Games'}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-6">
                        {isGenerating && (
                            <Card className="flex items-center justify-center h-96">
                                <div className="text-center">
                                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                                    <p className="mt-4 text-muted-foreground">Consulting the game shelf...</p>
                                </div>
                            </Card>
                        )}
                        
                        {!isGenerating && recommendations.length === 0 && (
                            <Card className="flex items-center justify-center h-96">
                                 <p className="text-muted-foreground">Your game recommendations will appear here.</p>
                            </Card>
                        )}

                        {!isGenerating && recommendations.map(({ game, reason }) => (
                             <Card key={game.id}>
                                <CardHeader>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <Link href={`/games/${game.id}`}>
                                            <Image 
                                                src={game.imageUrl} 
                                                alt={game.name} 
                                                width={100} 
                                                height={100} 
                                                className="rounded-lg object-cover h-24 w-24"
                                            />
                                        </Link>
                                        <div className="flex-1">
                                            <CardTitle>{game.name}</CardTitle>
                                            <CardDescription className="mt-2 text-sm text-foreground italic">
                                                &quot;{reason}&quot;
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

    

