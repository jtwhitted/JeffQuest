export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface Game {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  minPlayers?: number;
  maxPlayers?: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface Session {
  id: string;
  gameId: string;
  date: string; // ISO 8601 format
  playerIds: string[];
  winnerId: string;
  scores?: { playerId: string; score: number }[];
  notes?: string;
}
