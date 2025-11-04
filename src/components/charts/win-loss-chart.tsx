'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Session, Player } from '@/lib/types';
import { ChartTooltipContent } from '@/components/ui/chart';

interface WinLossChartProps {
  sessions: Session[];
  players: Player[];
}

export function WinLossChart({ sessions, players }: WinLossChartProps) {
  const data = players.map((player) => {
    const gamesPlayed = sessions.filter((s) => s.playerIds.includes(player.id));
    const wins = gamesPlayed.filter((s) => s.winnerId === player.id).length;
    const losses = gamesPlayed.length - wins;
    return {
      name: player.name,
      wins,
      losses,
    };
  });

  return (
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
        <Bar dataKey="wins" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
        <Bar dataKey="losses" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
