
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
                    placeholder="e.g., 'Chart my wins per player.' or 'What is my most played game category?' or 'Show a breakdown of my sessions per month.'"
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
