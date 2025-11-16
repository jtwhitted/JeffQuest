
export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  bggUsername?: string;
  legendaryTitle?: string;
  legendaryBio?: string;
}

export interface Game {
  id: string;
  name: string;
  category: string[];
  imageUrl: string;
  minPlayers: number;
  maxPlayers: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  mechanics?: string[];
  yearPublished?: number;
  description?: string;
  minPlaytime?: number;
  maxPlaytime?: number;
  rating?: number;
  ratingCount?: number;
  complexity?: number;
  designers?: string[];
  publishers?: string[];
  rulebookText?: string;
  userRating?: number;
}

export interface Session {
  id: string;
  gameId: string;
  date: string; // ISO 8601 format
  playerIds: string[];
  winnerId?: string; // Optional for co-op games
  cooperativeResult?: 'win' | 'loss'; // For co-op games
  scores?: { playerId: string; score?: number }[];
  notes?: string;
  duration?: number; // Duration in minutes
  isCooperative?: boolean;
}
