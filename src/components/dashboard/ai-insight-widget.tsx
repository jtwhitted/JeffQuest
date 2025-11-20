
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, WandSparkles, Info } from "lucide-react";
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";
import { generateDashboardInsight } from '@/ai/flows/generate-dashboard-insight';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function AiInsightWidget() {
    const { games, players, sessions } = useGames();
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!query.trim()) {
            toast({ variant: 'destructive', title: 'Please enter a question.' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await generateDashboardInsight({
                query,
                games,
                players,
                sessions
            });
            console.log('AI Insight Result:', result);
            toast({
                title: 'Insight Generated!',
                description: 'Check the browser console for the raw output.',
            });
        } catch (error: any) {
            console.error('Failed to generate insight:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'The AI could not generate an insight for this query.',
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            <WandSparkles className="text-primary" />
                            AI Insight Generator
                        </CardTitle>
                        <CardDescription>
                            Ask a question about your game data and get a custom visualization.
                        </CardDescription>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Info className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Available Data</h4>
                                    <p className="text-sm text-muted-foreground">
                                        The AI can access all of your logged games, players, and sessions to answer questions.
                                    </p>
                                </div>
                                <div className="grid gap-2 text-sm">
                                    <h5 className="font-semibold">Games Data</h5>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        <li>Name, Year Published, Description</li>
                                        <li>Player Count, Playtime, Difficulty</li>
                                        <li>Categories, Mechanics, Designers</li>
                                        <li>Your personal ratings</li>
                                    </ul>
                                    <h5 className="font-semibold mt-2">Players Data</h5>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        <li>Name, BGG Username</li>
                                    </ul>
                                    <h5 className="font-semibold mt-2">Sessions Data</h5>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        <li>Game Played, Date, Duration</li>
                                        <li>Participants, Winner, Scores</li>
                                        <li>Cooperative Results (Win/Loss)</li>
                                    </ul>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Example Questions: 'Chart my wins per player.' or 'What is my most played game category?'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                />
                <Button className="w-full" onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Analyzing...' : 'Generate Insight'}
                </Button>
            </CardContent>
        </Card>
    )
}
