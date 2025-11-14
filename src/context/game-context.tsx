
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { Game, Player, Session } from '@/lib/types';
import { addGame as addGameAction, addPlayer as addPlayerAction, addSession as addSessionAction, deleteGame as deleteGameAction, deletePlayer as deletePlayerAction, deleteSessionAction, updatePlayerAction } from '@/lib/actions';

type GameData = {
  name: string;
  bggId?: string;
  description?: string;
  yearPublished?: number;
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  maxPlaytime?: number;
  difficulty?: Game['difficulty'];
  category?: string[];
  mechanics?: string[];
  designers?: string[];
  publishers?: string[];
  imageUrl?: string;
}

interface GameContextType {
  games: Game[];
  players: Player[];
  sessions: Session[];
  addGame: (gameData: GameData) => Promise<Game>;
  addPlayer: (playerData: { name: string; avatarUrl?: string }) => Promise<Player>;
  updatePlayer: (playerId: string, playerData: Partial<Pick<Player, 'name' | 'avatarUrl' | 'legendaryTitle' | 'legendaryBio'>>) => Promise<Player>;
  addSession: (sessionData: any) => Promise<Session>;
  deleteGame: (gameId: string) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
  initialData: {
    games: Game[];
    players: Player[];
    sessions: Session[];
  };
}

export function GameProvider({ children, initialData }: GameProviderProps) {
  const [games, setGames] = useState<Game[]>(initialData.games);
  const [players, setPlayers] = useState<Player[]>(initialData.players);
  const [sessions, setSessions] = useState<Session[]>(initialData.sessions);
  const [isLoading, setIsLoading] = useState(false);

  const addGame = useCallback(async (gameData: GameData): Promise<Game> => {
    setIsLoading(true);
    try {
      // The server action now returns the newly created game.
      const newGame = await addGameAction(gameData);
      setGames(prevGames => [...prevGames, newGame]);
      return newGame;
    } catch (error) {
        // Re-throw the error to be caught by the calling component
        throw error;
    } 
    finally {
      setIsLoading(false);
    }
  }, []);

  const addPlayer = useCallback(async (playerData: { name: string; avatarUrl?: string }) => {
    setIsLoading(true);
    try {
      const newPlayer = await addPlayerAction(playerData);
      setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
      return newPlayer;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePlayer = useCallback(async (playerId: string, playerData: Partial<Pick<Player, 'name' | 'avatarUrl' | 'legendaryTitle' | 'legendaryBio'>>) => {
    setIsLoading(true);
    try {
        const updatedPlayer = await updatePlayerAction(playerId, playerData);
        setPlayers(prevPlayers => prevPlayers.map(p => p.id === playerId ? updatedPlayer : p));
        return updatedPlayer;
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const addSession = useCallback(async (sessionData: any) => {
    setIsLoading(true);
    try {
      const newSession = await addSessionAction(sessionData);
      setSessions(prevSessions => [...prevSessions, newSession]);
      return newSession;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteGame = useCallback(async (gameId: string) => {
    setIsLoading(true);
    try {
      await deleteGameAction(gameId);
      setGames(prev => prev.filter(g => g.id !== gameId));
      setSessions(prev => prev.filter(s => s.gameId !== gameId));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePlayer = useCallback(async (playerId: string) => {
    setIsLoading(true);
    try {
      await deletePlayerAction(playerId);
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      // This is a simplified update. A full implementation would re-evaluate winners, etc.
      setSessions(prev => prev.map(s => ({
        ...s,
        playerIds: s.playerIds.filter(id => id !== playerId),
        winnerId: s.winnerId === playerId ? undefined : s.winnerId
      })));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      await deleteSessionAction(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } finally {
      setIsLoading(false);
    }
  }, []);


  return (
    <GameContext.Provider value={{ games, players, sessions, addGame, addPlayer, updatePlayer, addSession, deleteGame, deletePlayer, deleteSession, isLoading }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGames() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGames must be used within a GameProvider');
  }
  return context;
}
