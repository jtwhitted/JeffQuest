
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X, Star } from "lucide-react";
import type { DashboardInsight, ChartDataItem, ListItem, StackedChartDataItem, AiInsightGame, AiInsightPlayer, AiInsightSession } from "@/lib/types";
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";
import { generateDashboardInsight, type GenerateInsightOutput } from '@/ai/flows/generate-dashboard-insight';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface SavedInsightWidgetProps {
    insight: DashboardInsight;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];


export function SavedInsightWidget({ insight }: SavedInsightWidgetProps) {
    const { deleteInsight, games, players, sessions } = useGames();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [generatedInsight, setGeneratedInsight] = useState<GenerateInsightOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generate = async () => {
            setIsLoading(true);
            setError(null);
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
                    query: insight.query,
                    games: insightGames,
                    players: insightPlayers,
                    sessions: insightSessions
                });
                setGeneratedInsight(result);
            } catch (err: any) {
                console.error(`Failed to generate saved insight for query "${insight.query}":`, err);
                setError(err.message || 'The AI failed to generate this insight.');
            } finally {
                setIsLoading(false);
            }
        };
        generate();
    }, [insight, games, players, sessions]);


    const handleDelete = async () => {
        try {
            await deleteInsight(insight.id);
            toast({
                title: 'Insight Removed',
                description: 'The saved insight has been deleted from your dashboard.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not remove the insight.',
            });
        }
    }

    const renderValueBadge = (value: string | number | undefined) => {
        if (value === undefined) return null;

        if (typeof value === 'number') {
            return (
                <Badge variant="outline" className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {value.toFixed(1)} / 10
                </Badge>
            );
        }
        return <Badge variant="outline">{value}</Badge>;
    }
    
     const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="ml-2">Generating visualization...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-48 text-destructive text-center p-4">
                    <p>{error}</p>
                </div>
            );
        }

        if (!generatedInsight) {
             return (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p>No insight could be generated.</p>
                </div>
            );
        }

        switch (generatedInsight.type) {
            case 'text':
                return <p className="text-lg p-6 pt-0">{generatedInsight.text}</p>;
            case 'barChart':
                return (
                    <ChartContainer config={{}} className="h-80 w-full">
                        <ResponsiveContainer>
                            <BarChart data={generatedInsight.data as ChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltipContent />} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                );
            case 'horizontalBarChart':
                 return (
                    <ChartContainer config={{}} className="h-80 w-full">
                        <ResponsiveContainer>
                            <BarChart data={generatedInsight.data as ChartDataItem[]} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                );
            case 'pieChart':
                return (
                    <ChartContainer config={{}} className="h-64 w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Pie data={generatedInsight.data as ChartDataItem[]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                    {generatedInsight.data?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                );
             case 'lineChart':
                return (
                     <ChartContainer config={{}} className="h-80 w-full">
                        <ResponsiveContainer>
                            <LineChart data={generatedInsight.data as ChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                );
            case 'stackedBarChart':
                 return (
                    <ChartContainer config={{}} className="h-80 w-full">
                        <ResponsiveContainer>
                            <BarChart data={generatedInsight.data as StackedChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                {generatedInsight.dataKeys?.map((key, index) => (
                                    <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                );
            case 'list':
                 return (
                    <ul className="space-y-4 p-6 pt-0">
                         {(generatedInsight.data as ListItem[]).map((item) => {
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
                                                        {renderValueBadge(item.value)}
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
                                                    {renderValueBadge(item.value)}
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
                                    {renderValueBadge(item.value)}
                                </li>
                            )
                        })}
                    </ul>
                );
            default:
                return <p className="text-center text-muted-foreground p-8">Unsupported insight type.</p>;
        }
    }


    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>{generatedInsight?.title || 'Saved Insight'}</CardTitle>
                        <CardDescription className="mt-1">
                           {insight.query}
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDelete}>
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Delete Insight</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
}

    