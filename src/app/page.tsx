import { getSessions, getPlayers, getGames } from '@/lib/data';
import DashboardClient from '@/components/dashboard-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Tabletop Tracker',
  description: 'Your board game statistics at a glance.',
};

export default async function DashboardPage() {
  const sessions = await getSessions();
  const players = await getPlayers();
  const games = await getGames();

  return (
    <div className="space-y-8">
      <DashboardClient sessions={sessions} players={players} games={games} />
    </div>
  );
}
