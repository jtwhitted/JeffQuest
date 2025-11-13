
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Session, Player } from '@/lib/types';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';

interface WinLossChartProps {
  sessions: Session[];
  players: Player[];
}

const chartConfig = {
    wins: {
      label: 'Wins',
      color: 'hsl(var(--chart-1))',
    },
    losses: {
      label: 'Losses',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;

export function WinLossChart({ sessions, players }: WinLossChartProps) {
  const data = players.map((player) => {
    const gamesPlayed = sessions.filter((s) => s.playerIds.includes(player.id));
    
    const wins = gamesPlayed.filter(s => 
        (s.winnerId === player.id) || 
        (s.cooperativeResult === 'win' && s.playerIds.includes(player.id))
    ).length;
    
    const losses = gamesPlayed.filter(s =>
        (!s.isCooperative && s.winnerId !== player.id) ||
        (s.cooperativeResult === 'loss' && s.playerIds.includes(player.id))
    ).length;

    return {
      name: player.name,
      wins,
      losses,
    };
  });

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            />
            <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{fontSize: "14px"}} />
            <Bar dataKey="wins" stackId="a" fill="var(--color-wins)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="losses" stackId="a" fill="var(--color-losses)" radius={[0, 4, 4, 0]} />
        </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
