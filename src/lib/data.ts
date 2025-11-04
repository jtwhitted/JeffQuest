
import { unstable_noStore as noStore } from 'next/cache';
import type { Player, Game, Session } from './types';
import { PlaceHolderImages } from './placeholder-images';

const players: Player[] = [
  { id: 'p1', name: 'Alex', avatarUrl: 'https://picsum.photos/seed/p1/200/200' },
  { id: 'p2', name: 'Ben', avatarUrl: 'https://picsum.photos/seed/p2/200/200' },
  { id: 'p3', name: 'Chris', avatarUrl: 'https://picsum.photos/seed/p3/200/200' },
  { id: 'p4', name: 'Dana', avatarUrl: 'https://picsum.photos/seed/p4/200/200' },
];

const games: Game[] = [
  { 
    id: 'g1', 
    name: 'Catan', 
    category: 'Strategy', 
    imageUrl: 'https://cf.geekdo-images.com/W3_MgieX6AR2V2Byi0s5sw__imagepage/img/M4wHHw_M3-2XvIe9KkY_g2uTf_g=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2419375.jpg',
    minPlayers: 3, 
    maxPlayers: 4, 
    difficulty: 'Intermediate', 
    mechanics: ['Trading', 'Route Building', 'Dice Rolling'],
    yearPublished: 1995,
    description: "<p>In Catan, players try to be the dominant force on the island of Catan by building settlements, cities, and roads. On each turn dice are rolled to determine what resources the island produces. Players collect these resources (wood, grain, brick, sheep, or stone) to build up their civilizations to get to 10 victory points and win the game.</p>",
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
    category: 'Card', 
    imageUrl: 'https://cf.geekdo-images.com/yLZJCVLlIx4c7eJEWUNJ7w__imagepage/img/uIjeoKgHMcRucikDtJtD9lCvwcE=/fit-in/900x600/filters:no_upscale():strip_icc()/pic4458123.jpg',
    minPlayers: 1, 
    maxPlayers: 5, 
    difficulty: 'Intermediate', 
    mechanics: ['Engine Building', 'Card Drafting', 'Set Collection'],
    yearPublished: 2019,
    description: "<p>Wingspan is a competitive, medium-weight, card-driven, engine-building board game from Stonemaier Games. You are bird enthusiasts—researchers, bird watchers, ornithologists, and collectors—seeking to discover and attract the best birds to your network of wildlife preserves.</p>",
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
    category: 'Dice', 
    imageUrl: 'https://cf.geekdo-images.com/m_RzXpHURC0_xLkvRj-t_g__imagepage/img/3o22113D-t3Z120U52L192iV2n4=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3043734.jpg',
    minPlayers: 2, maxPlayers: 6, 
    difficulty: 'Beginner', 
    mechanics: ['Dice Rolling', 'Player Elimination', 'King of the Hill'],
    yearPublished: 2011,
    description: "<p>In King of Tokyo, you play mutant monsters, gigantic robots, and strange aliens—all of whom are destroying Tokyo and whacking each other in order to become the one and only King of Tokyo. At the start of each turn, you roll six dice... The player who first obtains 20 victory points—or is the last monster standing—wins the game.</p>",
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
    category: 'RPG', 
    imageUrl: 'https://cf.geekdo-images.com/sZYp_3BTxCSRiJGStVyd4A__imagepage/img/jB9bS_319e-Gu2g22L2g4g4S53Y=/fit-in/900x600/filters:no_upscale():strip_icc()/pic2437871.jpg',
    minPlayers: 1, 
    maxPlayers: 4, 
    difficulty: 'Expert', 
    mechanics: ['Legacy', 'Campaign', 'Hand Management'],
    yearPublished: 2017,
    description: "<p>Gloomhaven is a game of Euro-inspired tactical combat in a persistent world of shifting motives. Players will take on the role of a wandering adventurer with their own special set of skills and their own reasons for traveling to this dark corner of the world.</p>",
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
    category: 'Sci-fi', 
    imageUrl: 'https://cf.geekdo-images.com/wg9oOLcsKvDesSUdZQ4rxw__imagepage/img/C3_H2oZf1L_1y0b2302cfn70sJw=/fit-in/900x600/filters:no_upscale():strip_icc()/pic3536616.jpg',
    minPlayers: 1, 
    maxPlayers: 5, 
    difficulty: 'Advanced', 
    mechanics: ['Hand Management', 'Tile Placement', 'Engine Building'],
    yearPublished: 2016,
    description: "<p>In the 2400s, mankind begins to terraform the planet Mars. Giant corporations, sponsored by the World Government on Earth, initiate huge projects to raise the temperature, the oxygen level, and the ocean coverage until the environment is habitable. In Terraforming Mars, you play one of those corporations and work together in the terraforming process, but compete for getting victory points that are awarded not only for your contribution to the terraforming, but also for advancing human infrastructure throughout the solar system, and doing other commendable things.</p>",
    minPlaytime: 120,
    maxPlaytime: 120,
    rating: 8.4,
    ratingCount: 90000,
    complexity: 3.2,
    designers: ['Jacob Fryxelius'],
    publishers: ['FryxGames']
  },
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

// Simulate API calls
export async function getPlayers(): Promise<Player[]> {
  noStore();
  return Promise.resolve(players);
}

export async function getGames(): Promise<Game[]> {
  noStore();
  return Promise.resolve(games);
}

export async function getSessions(): Promise<Session[]> {
  noStore();
  return Promise.resolve(sessions);
}

export async function getSessionById(id: string): Promise<Session | undefined> {
    noStore();
    return Promise.resolve(sessions.find(s => s.id === id));
}

export async function getGameById(id: string): Promise<Game | undefined> {
    noStore();
    return Promise.resolve(games.find(g => g.id === id));
}

export async function getPlayerById(id: string): Promise<Player | undefined> {
    noStore();
    return Promise.resolve(players.find(p => p.id === id));
}

    

    

