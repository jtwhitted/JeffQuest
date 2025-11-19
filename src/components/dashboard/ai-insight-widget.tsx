
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, WandSparkles } from "lucide-react";
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";
import { generateDashboardInsight } from '@/ai/flows/generate-dashboard-insight';

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
                <CardTitle className="flex items-center gap-2">
                    <WandSparkles className="text-primary" />
                    AI Insight Generator
                </CardTitle>
                <CardDescription>
                    Ask a question about your game data and get a custom visualization.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="e.g., 'Chart my wins per player for Catan' or 'Which game category have I played the most?'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isLoading}
                />
                <Button className="w-full" onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Analyzing...' : 'Generate Insight'}
                </Button>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground border-t pt-4">
                <p>Ask about your <strong className="text-foreground">games</strong>, <strong className="text-foreground">players</strong>, and <strong className="text-foreground">sessions</strong>.</p>
                <p className="font-semibold">Example questions:</p>
                <ul className="list-disc pl-5 text-xs space-y-1">
                    <li>Chart my wins per player.</li>
                    <li>What is my most played game category?</li>
                    <li>Who has the highest win rate in competitive games?</li>
                    <li>Show a breakdown of my sessions per month.</li>
                </ul>
            </CardFooter>
        </Card>
    )
}
