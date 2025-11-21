
export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  bggUsername?: string;
  legendaryTitle?: string;
  legendaryBio?: string;
}

export interface RulebookDocument {
  id: string;
  name:string;
  text: string;
}

export interface Game {
  id: string;
  name: string;
  bggId?: string;
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
  documents?: RulebookDocument[];
  userRatings?: { [playerId: string]: number };
  bggComments?: { username: string; comment: string }[];
  favoriteVideoId?: string;
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

export interface YoutubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
}


// Types for AI Insight Generator
export interface ChartDataItem {
    name: string;
    value: number;
}

export interface StackedChartDataItem {
    name: string;
    [key: string]: string | number; // e.g., { name: 'Player A', wins: 5, losses: 3 }
}

export interface ListItem {
    id: string;
    name: string;
    value?: string | number;
    detail?: string;
    imageUrl?: string;
}

export interface DashboardInsight {
    id: string;
    query: string;
}

// Slimmed down types for sending to AI
export interface AiInsightGame {
    id: string;
    name: string;
    yearPublished?: number;
    minPlayers: number;
    maxPlayers: number;
    minPlaytime?: number;
    maxPlaytime?: number;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    category?: string[];
    mechanics?: string[];
    rating?: number;
    userRatings?: { [playerId: string]: number };
    imageUrl: string;
}

export interface AiInsightPlayer {
    id: string;
    name: string;
}

export interface AiInsightSession {
    gameId: string;
    date: string;
    playerIds: string[];
    winnerId?: string;
    cooperativeResult?: 'win' | 'loss';
    scores?: { playerId: string, score?: number }[];
    duration?: number;
}
