'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Session } from '@/lib/types';
import { format, parseISO, startOfMonth } from 'date-fns';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';

interface GamesOverTimeChartProps {
  sessions: Session[];
}

const chartConfig = {
  sessions: {
    label: 'Sessions',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;


export function GamesOverTimeChart({ sessions }: GamesOverTimeChartProps) {
  const data = sessions.reduce((acc, session) => {
    const month = format(startOfMonth(parseISO(session.date)), 'MMM yyyy');
    const existing = acc.find((d) => d.month === month);
    if (existing) {
      existing.sessions++;
    } else {
      acc.push({ month, sessions: 1 });
    }
    return acc;
  }, [] as { month: string; sessions: number }[]);

  const sortedData = data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
              cursor={{ fill: 'hsl(var(--secondary))' }}
              content={<ChartTooltipContent />}
          />
          <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
