import type { Player, Game, Session } from './types';
import { PlaceHolderImages } from './placeholder-images';

const players: Player[] = [
  { id: 'p1', name: 'Alex', avatarUrl: PlaceHolderImages.find(img => img.id === 'player-1')?.imageUrl || '' },
  { id: 'p2', name: 'Ben', avatarUrl: PlaceHolderImages.find(img => img.id === 'player-2')?.imageUrl || '' },
  { id: 'p3', name: 'Chris', avatarUrl: PlaceHolderImages.find(img => img.id === 'player-3')?.imageUrl || '' },
  { id: 'p4', name: 'Dana', avatarUrl: PlaceHolderImages.find(img => img.id === 'player-4')?.imageUrl || '' },
];

const games: Game[] = [
  { id: 'g1', name: 'Catan', category: 'Strategy', imageUrl: PlaceHolderImages.find(img => img.id === 'game-1')?.imageUrl || '' },
  { id: 'g2', name: 'Wingspan', category: 'Card', imageUrl: PlaceHolderImages.find(img => img.id === 'game-2')?.imageUrl || '' },
  { id: 'g3', name: 'King of Tokyo', category: 'Dice', imageUrl: PlaceHolderImages.find(img => img.id === 'game-3')?.imageUrl || '' },
  { id: 'g4', name: 'Gloomhaven', category: 'RPG', imageUrl: PlaceHolderImages.find(img => img.id === 'game-4')?.imageUrl || '' },
  { id: 'g5', name: 'Terraforming Mars', category: 'Sci-fi', imageUrl: PlaceHolderImages.find(img => img.id === 'game-5')?.imageUrl || '' },
];

const sessions: Session[] = [
  {
    id: 's1',
    gameId: 'g1',
    date: '2024-07-15T19:00:00.000Z',
    playerIds: ['p1', 'p2', 'p3'],
    winnerId: 'p2',
    scores: [
      { playerId: 'p1', score: 7 },
      { playerId: 'p2', score: 10 },
      { playerId: 'p3', score: 5 },
    ],
    notes: 'Ben had a strong late game with the longest road and largest army.'
  },
  {
    id: 's2',
    gameId: 'g2',
    date: '2024-07-18T20:00:00.000Z',
    playerIds: ['p1', 'p4'],
    winnerId: 'p1',
    scores: [
      { playerId: 'p1', score: 85 },
      { playerId: 'p4', score: 72 },
    ],
    notes: 'Alex executed a powerful egg-laying strategy in the final rounds.'
  },
  {
    id: 's3',
    gameId: 'g3',
    date: '2024-07-20T18:30:00.000Z',
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    winnerId: 'p3',
    scores: [
      { playerId: 'p1', score: 15 },
      { playerId: 'p2', score: 18 },
      { playerId: 'p3', score: 20 },
      { playerId: 'p4', score: 12 },
    ],
    notes: 'Chris held Tokyo for three consecutive rounds to secure the win.'
  },
  {
    id: 's4',
    gameId: 'g5',
    date: '2024-07-22T19:00:00.000Z',
    playerIds: ['p2', 'p4'],
    winnerId: 'p4',
    scores: [
      { playerId: 'p2', score: 65 },
      { playerId: 'p4', score: 92 },
    ],
    notes: 'Dana focused on terraforming rating and milestones for a runaway victory.'
  },
  {
    id: 's5',
    gameId: 'g1',
    date: '2024-07-25T19:00:00.000Z',
    playerIds: ['p1', 'p3', 'p4'],
    winnerId: 'p1',
    scores: [
      { playerId: 'p1', score: 10 },
      { playerId: 'p3', score: 8 },
      { playerId: 'p4', score: 6 },
    ],
    notes: 'Alex managed to snatch Longest Road at the very end.'
  }
];

// Simulate API calls
export async function getPlayers(): Promise<Player[]> {
  return Promise.resolve(players);
}

export async function getGames(): Promise<Game[]> {
  return Promise.resolve(games);
}

export async function getSessions(): Promise<Session[]> {
  return Promise.resolve(sessions);
}

export async function getSessionById(id: string): Promise<Session | undefined> {
    return Promise.resolve(sessions.find(s => s.id === id));
}

export async function getGameById(id: string): Promise<Game | undefined> {
    return Promise.resolve(games.find(g => g.id === id));
}

export async function getPlayerById(id: string): Promise<Player | undefined> {
    return Promise.resolve(players.find(p => p.id === id));
}
