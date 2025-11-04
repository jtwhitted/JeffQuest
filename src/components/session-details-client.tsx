'use client';

import { useState } from 'react';
import type { Session, Game, Player } from '@/lib/types';
import { generateSessionSummary as generateQuickSummary } from '@/ai/flows/session-summaries';
import { generateSessionSummary as generateDetailedReport } from '@/ai/flows/match-result-ai-assistant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, Crown, Loader2, ShieldCheck, ShieldX, Sparkles, Trophy, Users } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface SessionDetailsClientProps {
  session: Session;
  game: Game;
  players: Player[];
  winner?: Player;
}

type AiStateType = {
  loading: boolean;
  error: string | null;
  summary: string | null;
};

export default function SessionDetailsClient({ session, game, players, winner }: SessionDetailsClientProps) {
  const { toast } = useToast();
  const [interestingEvents, setInterestingEvents] = useState(session.notes || '');
  const [quickSummaryState, setQuickSummaryState] = useState<AiStateType>({ loading: false, error: null, summary: null });
  const [detailedReportState, setDetailedReportState] = useState<AiStateType>({ loading: false, error: null, summary: null });

  const gameDetails = {
    category: game.category,
    minPlayers: game.minPlayers || 1,
    maxPlayers: game.maxPlayers || 1,
    difficulty: game.difficulty,
  };

  const handleGenerateQuickSummary = async () => {
    setQuickSummaryState({ loading: true, error: null, summary: null });
    try {
      const result = await generateQuickSummary({
        gameName: game.name,
        gameDetails,
        datePlayed: session.date,
        players: players.map(p => p.name),
        gameStats: {
            winner: winner?.name,
            cooperativeResult: session.cooperativeResult,
            scores: session.scores,
        },
        interestingEvents: interestingEvents
      });
      setQuickSummaryState({ loading: false, error: null, summary: result.summary });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setQuickSummaryState({ loading: false, error: errorMessage, summary: null });
      toast({
        variant: 'destructive',
        title: 'Error Generating Summary',
        description: errorMessage,
      });
    }
  };

  const handleGenerateDetailedReport = async () => {
    if (!winner && !session.cooperativeResult) {
        toast({ variant: 'destructive', title: 'Cannot generate report without a winner or co-op result.'});
        return;
    }
    setDetailedReportState({ loading: true, error: null, summary: null });
    try {
      const result = await generateDetailedReport({
        gameName: game.name,
        gameDetails,
        datePlayed: session.date,
        players: players.map(p => p.name),
        winningPlayer: winner?.name,
        cooperativeResult: session.cooperativeResult,
        interestingEvents: interestingEvents
      });
      setDetailedReportState({ loading: false, error: null, summary: result.summary });
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setDetailedReportState({ loading: false, error: errorMessage, summary: null });
        toast({
            variant: 'destructive',
            title: 'Error Generating Report',
            description: errorMessage,
        });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <Card>
            <CardHeader className="relative h-64 overflow-hidden rounded-t-lg p-0">
                <Image src={game.imageUrl} alt={game.name} fill className="object-cover" data-ai-hint={`${game.category} game art`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                 <div className="absolute bottom-0 left-0 p-6">
                    <h2 className="text-3xl font-bold text-white">{game.name}</h2>
                    <p className="text-lg text-gray-300">{format(new Date(session.date), 'MMMM d, yyyy')}</p>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Session Notes & Events</h3>
                <Textarea
                    placeholder="Describe any interesting moments, funny quotes, or key strategies..."
                    value={interestingEvents}
                    onChange={(e) => setInterestingEvents(e.target.value)}
                    rows={5}
                />
                <p className="mt-2 text-sm text-muted-foreground">This information will be used by the AI to generate summaries.</p>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>Generate engaging summaries of your game session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Summary Section */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Quick Session Summary</h3>
                <Button onClick={handleGenerateQuickSummary} disabled={quickSummaryState.loading} size="sm">
                  {quickSummaryState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>
              {quickSummaryState.summary && <div className="mt-4 rounded-lg border bg-secondary/50 p-4 text-sm prose dark:prose-invert max-w-none"><p>{quickSummaryState.summary}</p></div>}
              {quickSummaryState.error && <p className="mt-2 text-sm text-destructive">{quickSummaryState.error}</p>}
            </div>

            {/* Detailed Report Section */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Detailed Match Report</h3>
                <Button onClick={handleGenerateDetailedReport} disabled={detailedReportState.loading} size="sm">
                  {detailedReportState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>
              {detailedReportState.summary && <div className="mt-4 rounded-lg border bg-secondary/50 p-4 text-sm prose dark:prose-invert max-w-none"><p>{detailedReportState.summary}</p></div>}
              {detailedReportState.error && <p className="mt-2 text-sm text-destructive">{detailedReportState.error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Players & Scores</CardTitle>
            {session.cooperativeResult && (
                <CardDescription className="flex items-center">
                    {session.cooperativeResult === 'win' ? <ShieldCheck className="mr-2 h-4 w-4 text-green-500" /> : <ShieldX className="mr-2 h-4 w-4 text-red-500" />}
                    Cooperative {session.cooperativeResult === 'win' ? 'Win' : 'Loss'}
                </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {players.map(player => {
                const score = session.scores?.find(s => s.playerId === player.id)?.score;
                const isWinner = player.id === winner?.id;
                return (
                  <li key={player.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.avatarUrl} alt={player.name} />
                        <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="flex items-center">
                        {score !== undefined && <span className="mr-3 font-semibold text-lg">{score}</span>}
                        {isWinner && <Trophy className="h-5 w-5 text-amber-400" />}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
