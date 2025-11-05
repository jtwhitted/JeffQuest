
import { unstable_noStore as noStore } from 'next/cache';
import type { Player, Game, Session } from './types';
import { PlaceHolderImages } from './placeholder-images';

// This file now acts as a mock database.
// All data fetching and mutation should go through `lib/actions.ts` to ensure consistency.

export let players: Player[] = [
  { id: 'p1', name: 'Alex', avatarUrl: 'https://images.unsplash.com/photo-1535643302794-19c3804b874b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8cGVyc29uJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzYyMjgwNTQ5fDA&ixlib=rb-4.1.0&q=80&w=200' },
  { id: 'p2', name: 'Ben', avatarUrl: 'https://images.unsplash.com/photo-1592621385612-4d7129426394?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHx3b21hbiUyMHBvcnRyYWl0fGVufDB8fHx8MTc2MjI0NDMxOHww&ixlib=rb-4.1.0&q=80&w=200' },
  { id: 'p3', name: 'Chris', avatarUrl: 'https://images.unsplash.com/photo-1607031542107-f6f46b5d54e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjIyMjQ5MzB8MA&ixlib=rb-4.1.0&q=80&w=200' },
  { id: 'p4', name: 'Dana', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxwZXJzb24lMjBzbWlsaW5nfGVufDB8fHx8MTc2MjI4NTc0OHww&ixlib=rb-4.1.0&q=80&w=200' },
];

export let games: Game[] = [
  {
    id: 'g1',
    name: 'Catan',
    category: 'Strategy',
    minPlayers: 3,
    maxPlayers: 4,
    difficulty: 'Intermediate',
    mechanics: ['Dice Rolling', 'Hex and Counter', 'Trading'],
    yearPublished: 1995,
    description: 'In Catan, players try to be the dominant force on the island of Catan by building settlements, cities, and roads. On each turn dice are rolled to determine what resources the island produces. Players collect these resources to build up their civilizations to get to 10 victory points and win the game.',
    imageUrl: PlaceHolderImages.find(p => p.id === 'game-1')?.imageUrl || '',
    minPlaytime: 60,
    maxPlaytime: 120,
    rating: 7.1,
    ratingCount: 100000,
    complexity: 2.3,
    designers: ['Klaus Teuber'],
    publishers: ['Catan Studio']
  },
  {
    id: 'g2',
    name: 'Wingspan',
    category: 'Strategy',
    minPlayers: 1,
    maxPlayers: 5,
    difficulty: 'Intermediate',
    mechanics: ['Card Drafting', 'Engine Building', 'Set Collection'],
    yearPublished: 2019,
    description: 'Wingspan is a competitive, medium-weight, card-driven, engine-building board game from Stonemaier Games. You are bird enthusiasts—researchers, bird watchers, ornithologists, and collectors—seeking to discover and attract the best birds to your network of wildlife preserves.',
    imageUrl: PlaceHolderImages.find(p => p.id === 'game-2')?.imageUrl || '',
    minPlaytime: 40,
    maxPlaytime: 70,
    rating: 8.1,
    ratingCount: 80000,
    complexity: 2.4,
    designers: ['Elizabeth Hargrave'],
    publishers: ['Stonemaier Games']
  },
  {
    id: 'g3',
    name: 'King of Tokyo',
    category: 'Family',
    minPlayers: 2,
    maxPlayers: 6,
    difficulty: 'Beginner',
    mechanics: ['Area Control', 'Dice Rolling', 'Player Elimination'],
    yearPublished: 2011,
    description: 'In King of Tokyo, you play mutant monsters, gigantic robots, and strange aliens—all of whom are destroying Tokyo and whacking each other in order to become the one and only King of Tokyo. At the start of each turn, you roll six dice... The player who first obtains 20 victory points—or is the last monster standing—wins the game.',
    imageUrl: PlaceHolderImages.find(p => p.id === 'game-3')?.imageUrl || '',
    minPlaytime: 30,
    maxPlaytime: 30,
    rating: 7.2,
    ratingCount: 75000,
    complexity: 1.5,
    designers: ['Richard Garfield'],
    publishers: ['IELLO']
  },
  {
    id: 'g4',
    name: 'Gloomhaven',
    category: 'Adventure',
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: 'Expert',
    mechanics: ['Campaign', 'Legacy', 'Hand Management'],
    yearPublished: 2017,
    description: 'Gloomhaven is a game of Euro-inspired tactical combat in a persistent world of shifting motives. Players will take on the role of a wandering adventurer with their own special set of skills and their own reasons for traveling to this dark corner of the. world.',
    imageUrl: PlaceHolderImages.find(p => p.id === 'game-4')?.imageUrl || '',
    minPlaytime: 60,
    maxPlaytime: 120,
    rating: 8.7,
    ratingCount: 45000,
    complexity: 3.8,
    designers: ['Isaac Childres'],
    publishers: ['Cephalofair Games']
  },
  {
    id: 'g5',
    name: 'Terraforming Mars',
    category: 'Sci-Fi',
    minPlayers: 1,
    maxPlayers: 5,
    difficulty: 'Advanced',
    mechanics: ['Card Drafting', 'Engine Building', 'Tile Placement'],
    yearPublished: 2016,
    description: 'In the 2400s, mankind begins to terraform the planet Mars. Giant corporations, sponsored by the World Government on Earth, initiate huge projects to raise the temperature, the oxygen level, and the ocean coverage until the environment is habitable. In Terraforming Mars, you play one of those corporations and work together in the terraforming process, but compete for getting victory points that are awarded for your contribution to the terraforming and for advancing human infrastructure.',
    imageUrl: PlaceHolderImages.find(p => p.id === 'game-5')?.imageUrl || '',
    minPlaytime: 120,
    maxPlaytime: 120,
    rating: 8.4,
    ratingCount: 90000,
    complexity: 3.2,
    designers: ['Jacob Fryxelius'],
    publishers: ['FryxGames']
  }
];

export let sessions: Session[] = [
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
  },
  {
    id: 's6',
    gameId: 'g4',
    date: '2024-07-28T14:00:00.000Z',
    playerIds: ['p1', 'p2', 'p3', 'p4'],
    cooperativeResult: 'win',
    notes: 'A close call, but we finally beat the scenario! Dana delivered the final blow.'
  }
];

// Functions to modify the mock database
export function addGameToDB(game: Game) {
    games.push(game);
}

export function addSessionToDB(session: Session) {
    sessions.push(session);
}

export function addPlayerToDB(player: Player) {
    players.push(player);
}

export function deleteGameFromDB(gameId: string) {
    games = games.filter(g => g.id !== gameId);
    sessions = sessions.filter(s => s.gameId !== gameId);
}

export function deletePlayerFromDB(playerId: string) {
    players = players.filter(p => p.id !== playerId);
    sessions = sessions.map(s => {
        const newPlayerIds = s.playerIds.filter(id => id !== playerId);
        if (newPlayerIds.length < s.playerIds.length) {
            let winnerId = s.winnerId;
            if (winnerId === playerId) {
                winnerId = undefined; // Or handle this case differently
            }
            return { ...s, playerIds: newPlayerIds, winnerId };
        }
        return s;
    });
}
