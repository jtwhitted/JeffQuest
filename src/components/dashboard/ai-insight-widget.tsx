
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, WandSparkles, Info, X, Save } from "lucide-react";
import { useGames } from "@/context/game-context";
import { useToast } from "@/hooks/use-toast";
import { generateDashboardInsight, type GenerateInsightOutput } from '@/ai/flows/generate-dashboard-insight';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { Badge } from '../ui/badge';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AiInsightWidget() {
    const { games, players, sessions } = useGames();
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [insight, setInsight] = useState<GenerateInsightOutput | null>(null);

    const handleGenerate = async () => {
        if (!query.trim()) {
            toast({ variant: 'destructive', title: 'Please enter a question.' });
            return;
        }
        setIsLoading(true);
        setInsight(null);
        try {
            const result = await generateDashboardInsight({
                query,
                games,
                players,
                sessions
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
            setIsLoading(false);
        }
    };

    const renderInsight = () => {
        if (!insight) return null;

        return (
            <div className="mt-6 rounded-lg border bg-secondary/30">
                <CardHeader>
                    {insight.title && <CardTitle>{insight.title}</CardTitle>}
                </CardHeader>
                <CardContent>
                    {insight.type === 'text' && (
                         <p className="text-lg">{insight.text}</p>
                    )}
                    {(insight.type === 'barChart' || (insight.type === 'list' && typeof insight.data?.[0]?.value === 'number')) && insight.data && (
                        <ChartContainer config={{}} className="h-80 w-full">
                            <ResponsiveContainer>
                                <BarChart data={insight.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={120} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
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
                                    <Pie data={insight.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                        {insight.data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    )}
                     {insight.type === 'list' && typeof insight.data?.[0]?.value !== 'number' && insight.data && (
                        <ul className="space-y-3">
                            {insight.data.map((item, index) => (
                                <li key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{item.name}</span>
                                        {item.detail && <span className="text-xs text-muted-foreground">{item.detail}</span>}
                                    </div>
                                    {item.value && <Badge variant="outline">{item.value}</Badge>}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="ghost" onClick={() => setInsight(null)}>
                        <X className="mr-2" />
                        Clear
                    </Button>
                     <Button variant="outline" disabled>
                        <Save className="mr-2" />
                        Save Insight
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
                
                {renderInsight()}

            </CardContent>
        </Card>
    )
}
