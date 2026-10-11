'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Star, Dices } from "lucide-react";
import type { DashboardInsight, ChartDataItem, ListItem, StackedChartDataItem, Game, Player, Session } from '@/lib/types';
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

interface SavedInsightWidgetProps {
    insight: DashboardInsight;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// This function is the single source of truth for processing insight data on the client.
function processDataForInsight(
    insightStructure: Omit<DashboardInsight['generatedInsight'], 'data'>,
    allGames: Game[],
    allPlayers: Player[],
    allSessions: Session[],
    query: string
): (ListItem & { valueType?: 'rating' | 'playtime' })[] | (ChartDataItem | StackedChartDataItem)[] {
    
    const lowerQuery = query.toLowerCase();
    const lowerTitle = insightStructure.title?.toLowerCase() || '';
    const combinedQuery = lowerQuery + lowerTitle;

    if (insightStructure.type === 'list') {
        let filteredGames: Game[] = [...allGames];
        let valueType: 'rating' | 'playtime' | undefined = undefined;

        // --- FILTERING ---
        const timeMatch = combinedQuery.match(/(less than|under)\s+(an|\d+|one|two|three|four|five)\s*(hour|minute)s?/);
        if (timeMatch) {
            const quantityStr = timeMatch[2];
            let quantity;
            if (quantityStr === 'an' || quantityStr === 'one') quantity = 1;
            else if (quantityStr === 'two') quantity = 2;
            else if (quantityStr === 'three') quantity = 3;
            else if (quantityStr === 'four') quantity = 4;
            else if (quantityStr === 'five') quantity = 5;
            else quantity = parseInt(quantityStr, 10);
            
            if (!isNaN(quantity)) {
                let minutes = quantity;
                if (timeMatch[3].startsWith('hour')) {
                    minutes *= 60;
                }
                filteredGames = filteredGames.filter(g => g.maxPlaytime != null && g.maxPlaytime <= minutes);
            }
        }
        
        if (combinedQuery.includes('cooperative')) {
            filteredGames = filteredGames.filter(g => g.mechanics?.includes('Cooperative Game'));
        }
        
        // --- SORTING & VALUE TYPE ---
        if (combinedQuery.includes('play time') || combinedQuery.includes('hour') || combinedQuery.includes('minute')) {
            filteredGames.sort((a, b) => (a.maxPlaytime || 999) - (b.maxPlaytime || 999));
            valueType = 'playtime';
        } else if (combinedQuery.includes('rank') || combinedQuery.includes('rating')) {
             filteredGames.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
             valueType = 'rating';
        } else {
             // Default sort for lists if not otherwise specified
             filteredGames.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
        }
        
        if (lowerQuery.includes('descending')) {
            filteredGames.reverse();
        }

        // --- MAPPING ---
        return filteredGames.map(game => ({
            id: game.id,
            name: game.name,
            value: valueType === 'playtime' ? game.maxPlaytime : game.rating,
            detail: valueType === 'playtime' ? `${game.minPlaytime}-${game.maxPlaytime} min` : (game.category?.[0] || ''),
            imageUrl: game.imageUrl,
            valueType: valueType,
        }));
    }
    
     if (insightStructure.type === 'text') {
        let textResult = "I can't answer that question yet, but I'm always learning!";
        if (combinedQuery.includes('total sessions')) {
            textResult = `You have logged a total of ${allSessions.length} sessions.`;
        } else if (combinedQuery.includes('total games')) {
            textResult = `You have ${allGames.length} games in your collection.`;
        } else if (combinedQuery.includes('win rate')) {
             const wins = allSessions.filter(s => s.winnerId || s.cooperativeResult === 'win').length;
             const total = allSessions.length;
             const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
             textResult = `Your overall win rate across all games is ${winRate}%.`;
        }
        return [{ id: 'text-result', name: textResult }];
    }

    if (insightStructure.type === 'barChart' || insightStructure.type === 'horizontalBarChart') {
        const playCounts = allSessions.reduce((acc, session) => {
            const gameName = allGames.find(g => g.id === session.gameId)?.name || 'Unknown Game';
            acc[gameName] = (acc[gameName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(playCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
    }
    
     if (insightStructure.type === 'pieChart') {
        const categoryCounts = allGames.reduce((acc, game) => {
            game.category?.forEach(cat => {
                acc[cat] = (acc[cat] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(categoryCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
    }

    if (insightStructure.type === 'lineChart') {
        if (allSessions.length === 0) return [];
        const sortedSessions = [...allSessions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstMonth = startOfMonth(parseISO(sortedSessions[0].date));
        const lastMonth = endOfMonth(new Date());

        const months = eachMonthOfInterval({ start: firstMonth, end: lastMonth });
        
        return months.map(month => {
            const count = allSessions.filter(s => format(parseISO(s.date), 'yyyy-MM') === format(month, 'yyyy-MM')).length;
            return { name: format(month, 'MMM yyyy'), value: count };
        });
    }

    if (insightStructure.type === 'stackedBarChart' && insightStructure.dataKeys) {
        return allPlayers.map(player => {
            const playerSessions = allSessions.filter(s => s.playerIds.includes(player.id));
            const stats: StackedChartDataItem = { name: player.name };

            insightStructure.dataKeys?.forEach(key => {
                if (key.toLowerCase().includes('win')) {
                    stats[key] = playerSessions.filter(s => s.winnerId === player.id || (s.cooperativeResult === 'win' && s.playerIds.includes(player.id))).length;
                } else if (key.toLowerCase().includes('loss')) {
                    stats[key] = playerSessions.filter(s => (!s.isCooperative && s.winnerId && s.winnerId !== player.id) || (s.cooperativeResult === 'loss' && s.playerIds.includes(player.id))).length;
                } else {
                    stats[key] = 0;
                }
            });
            return stats;
        });
    }
    
    return []; // Return empty for unimplemented types
}

export function SavedInsightWidget({ insight }: SavedInsightWidgetProps) {
    const { deleteInsight, games, players, sessions } = useGames();
    const { toast } = useToast();
    const [_, forceRender] = useState(0); 
    
    const handleDelete = async () => {
        try {
            await deleteInsight(insight.id);
            toast({
                title: 'Insight Removed',
                description: 'The saved insight has been deleted from your dashboard.',
            });
        } catch (error) {
            console.error('Failed to remove insight:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not remove the insight.',
            });
        }
    }

    const renderValueBadge = (value: string | number | undefined, valueType?: 'rating' | 'playtime') => {
        if (value === undefined) return null;
    
        if (valueType === 'rating' && typeof value === 'number') {
            return (
                <Badge variant="outline" className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {value.toFixed(1)} / 10
                </Badge>
            );
        }
        if (valueType === 'playtime' && typeof value === 'number') {
             return <Badge variant="outline">{value} min</Badge>;
        }
        return <Badge variant="outline">{value}</Badge>;
    }
    
     const renderContent = () => {
        const dataToRender = processDataForInsight(insight.generatedInsight, games, players, sessions, insight.query);
        const { generatedInsight: insightStructure } = insight;

        if (!insightStructure) {
             return (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p>No visualization data found.</p>
                </div>
            );
        }

        switch (insightStructure.type) {
            case 'text':
                return <p className="text-lg p-6 pt-0">{(dataToRender[0] as ListItem).name}</p>;
            case 'barChart':
                return (
                    <ChartContainer config={{}} className="h-80 w-full">
                        <ResponsiveContainer>
                            <BarChart data={dataToRender as ChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                            <BarChart data={dataToRender as ChartDataItem[]} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                                <Pie data={dataToRender as ChartDataItem[]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                    {dataToRender?.map((entry, index) => (
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
                            <LineChart data={dataToRender as ChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                            <BarChart data={dataToRender as StackedChartDataItem[]} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend />
                                {insightStructure.dataKeys?.map((key, index) => (
                                    <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                );
            case 'list':
                 return (
                    <ul className="space-y-4 p-6 pt-0">
                         {(dataToRender as (ListItem & { valueType?: 'rating' | 'playtime' })[]).map((item) => {
                            if (item.id && games.some(g => g.id === item.id)) { // This is a game
                                return (
                                    <li key={item.id}>
                                        <Link href={`/games/${item.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                            <div className="flex items-start gap-4">
                                                {item.imageUrl ? (
                                                    <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="rounded-md object-cover h-16 w-16" />
                                                ) : (
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                                                        <Dices className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold">{item.name}</h4>
                                                            {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                                                        </div>
                                                        {renderValueBadge(item.value, item.valueType)}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                )
                            }
                            if (item.id && players.some(p => p.id === item.id)) { // This is likely a player
                                return (
                                        <li key={item.id}>
                                        <Link href={`/players`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                                            <div className="flex items-start gap-4">
                                                    <Avatar className="h-16 w-16">
                                                    <AvatarImage src={item.imageUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${encodeURIComponent(item.name)}`} alt={item.name} />
                                                    <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold">{item.name}</h4>
                                                    {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                                                    {renderValueBadge(item.value, item.valueType)}
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
                                    {renderValueBadge(item.value, item.valueType)}
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
                        <CardTitle>{insight.generatedInsight?.title || 'Saved Insight'}</CardTitle>
                        <CardDescription className="mt-1">
                           {insight.query}
                        </CardDescription>
                    </div>
                     <div className='flex items-center'>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                            toast({ title: 'Insight Refreshed' });
                            forceRender(c => c + 1);
                        }} >
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Refresh Insight</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDelete}>
                            <X className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Delete Insight</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {renderContent()}
            </CardContent>
        </Card>
    );
}

    