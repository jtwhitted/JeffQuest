import { getSessions, getPlayers, getGames } from '@/lib/actions';
import DashboardClient from '@/components/dashboard-client';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';

export const metadata: Metadata = {
  title: 'Dashboard | Tabletop Tracker',
  description: 'Your board game statistics at a glance.',
};

export default async function DashboardPage() {
  noStore();
  const sessions = await getSessions();
  const players = await getPlayers();
  const games = await getGames();

  return (
    <div className="space-y-8">
      <DashboardClient sessions={sessions} players={players} games={games} />
    </div>
  );
}
