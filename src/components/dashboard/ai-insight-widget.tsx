
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, WandSparkles, Info, X } from "lucide-react";
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";
import { generateDashboardInsight, type GenerateInsightOutput } from '@/ai/flows/generate-dashboard-insight';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import type { AiInsightGame, AiInsightPlayer, AiInsightSession, ChartDataItem, ListItem, StackedChartDataItem } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const loadingSteps = [
    "Parsing your question...",
    "Querying your game data...",
    "Analyzing the numbers...",
    "Generating visualization...",
    "Finalizing the chart...",
];

export function AiInsightWidget() {
    const { games, players, sessions } = useGames();
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [insight, setInsight] = useState<GenerateInsightOutput | null>(null);

     useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loadingMessage && loadingMessage !== 'Error') {
            let step = 0;
            const updateStep = () => {
                setLoadingMessage(loadingSteps[step % loadingSteps.length]);
                step++;
            };
            timer = setInterval(updateStep, 2000);
        }
        return () => clearInterval(timer);
    }, [loadingMessage]);


    const handleGenerate = async () => {
        if (!query.trim() || loadingMessage) {
            if (!query.trim()) toast({ variant: 'destructive', title: 'Please enter a question.' });
            return;
        }
        setLoadingMessage(loadingSteps[0]);
        setInsight(null);
        try {
            // Create slimmed down versions of the data to send to the AI
            const insightGames: AiInsightGame[] = games.map(g => ({
                id: g.id,
                name: g.name,
                yearPublished: g.yearPublished,
                minPlayers: g.minPlayers,
                maxPlayers: g.maxPlayers,
                minPlaytime: g.minPlaytime,
                maxPlaytime: g.maxPlaytime,
                difficulty: g.difficulty,
                category: g.category,
                mechanics: g.mechanics,
                rating: g.rating,
                userRatings: g.userRatings,
                imageUrl: g.imageUrl,
            }));

            const insightPlayers: AiInsightPlayer[] = players.map(p => ({
                id: p.id,
                name: p.name,
            }));

            const insightSessions: AiInsightSession[] = sessions.map(s => ({
                gameId: s.gameId,
                date: s.date,
                playerIds: s.playerIds,
                winnerId: s.winnerId,
                cooperativeResult: s.cooperativeResult,
                scores: s.scores,
                duration: s.duration,
            }));

            const result = await generateDashboardInsight({
                query,
                games: insightGames,
                players: insightPlayers,
                sessions: insightSessions
            });
            setInsight(result);
        } catch (error: any) {
            console.error('Failed to generate insight:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'The AI could not generate an insight for this query.',
            });
        } finally {
            setLoadingMessage('');
        }
    };
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevents adding a new line
            handleGenerate();
        }
    };

    const handleClear = () => {
        setInsight(null);
        setQuery('');
    };

    const renderInsight = () => {
        if (!insight) return null;

        return (
            <div className="mt-6 rounded-lg border bg-secondary/30">
                <CardHeader>
                    {insight.title && <CardTitle>{insight.title}</CardTitle>}
                </CardHeader>
                <CardContent>
                    {insight.type === 'text' && insight.text && (
                         <p className="text-lg">{insight.text}</p>
                    )}
                    {insight.type === 'barChart' && insight.data && (
                        <ChartContainer config={{}} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={insight.data as ChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                     <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                    {insight.type === 'horizontalBarChart' && insight.data && (
                        <ChartContainer config={{}} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={insight.data as ChartDataItem[]} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={120} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        interval={0}
                                    />
                                    <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                    {insight.type === 'pieChart' && insight.data && (
                        <ChartContainer config={{}} className="h-64 w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Pie data={insight.data as ChartDataItem[]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                        {insight.data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                    {insight.type === 'lineChart' && insight.data && (
                         <ChartContainer config={{}} className="h-80 w-full">
                            <ResponsiveContainer>
                                <LineChart data={insight.data as ChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                    {insight.type === 'stackedBarChart' && insight.data && insight.dataKeys && (
                        <ChartContainer config={{}} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={insight.data as StackedChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    {insight.dataKeys.map((key, index) => (
                                        <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                     {insight.type === 'list' && insight.data && (
                        <ul className="space-y-4">
                            {(insight.data as ListItem[]).map((item) => {
                                 if (item.imageUrl && item.id) { // This is a game
                                    return (
                                        <li key={item.id}>
                                            <Link href={`/games/${item.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                                <div className="flex items-start gap-4">
                                                    <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="rounded-md object-cover h-16 w-16" />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-semibold">{item.name}</h4>
                                                                {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                                                            </div>
                                                            {item.value && <Badge variant="outline">{item.value}</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </li>
                                    )
                                }
                                if (item.id) { // This is likely a player
                                    return (
                                         <li key={item.id}>
                                            <Link href={`/players`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                                <div className="flex items-start gap-4">
                                                     <Avatar className="h-16 w-16">
                                                        <AvatarImage src={`https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(item.name)}`} alt={item.name} />
                                                        <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{item.name}</h4>
                                                        {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                                                        {item.value && <Badge variant="outline" className="mt-1">{item.value}</Badge>}
                                                    </div>
                                                </div>
                                            </Link>
                                        </li>
                                    )
                                }
                                // Default simple list item
                                return (
                                    <li key={item.name} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{item.name}</span>
                                            {item.detail && <span className="text-xs text-muted-foreground">{item.detail}</span>}
                                        </div>
                                        {item.value && <Badge variant="outline">{item.value}</Badge>}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="ghost" onClick={handleClear}>
                        <X className="mr-2" />
                        Clear
                    </Button>
                </CardFooter>
            </div>
        );
    }


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
                                        <li>Name, Year Published</li>
                                        <li>Player Count, Playtime, Difficulty</li>
                                        <li>Categories, Mechanics</li>
                                        <li>Your personal ratings</li>
                                    </ul>
                                    <h5 className="font-semibold mt-2">Players Data</h5>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        <li>Name</li>
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
                    placeholder="Example: 'Chart my wins vs losses per player' or 'List my most played game category'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!!loadingMessage}
                    rows={3}
                />
                <Button className="w-full" onClick={handleGenerate} disabled={!!loadingMessage}>
                    {loadingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                    {loadingMessage || 'Generate Insight'}
                </Button>
                
                {renderInsight()}

            </CardContent>
        </Card>
    )
}

    