
'use client';
import DashboardClient from '@/components/dashboard-client';
import { useGames } from '@/context/game-context';

export default function DashboardPage() {
  const { sessions, players, games, isLoading } = useGames();

  return (
    <div className="space-y-8">
      <DashboardClient sessions={sessions} players={players} games={games} />
    </div>
  );
}
