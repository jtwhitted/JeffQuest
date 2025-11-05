
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { Game, Player, Session } from '@/lib/types';
import { addGame as addGameAction, addPlayer as addPlayerAction, addSession as addSessionAction } from '@/lib/actions';
import type { GetGameDetailsOutput } from '@/ai/flows/get-game-title-from-image';

interface GameContextType {
  games: Game[];
  players: Player[];
  sessions: Session[];
  addGame: (gameData: GetGameDetailsOutput) => Promise<Game>;
  addPlayer: (playerData: { name: string; avatarUrl?: string }) => Promise<Player>;
  addSession: (sessionData: any) => Promise<Session>;
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

  const addGame = useCallback(async (gameData: GetGameDetailsOutput) => {
    setIsLoading(true);
    try {
      const newGame = await addGameAction(gameData);
      setGames(prevGames => [...prevGames, newGame]);
      return newGame;
    } finally {
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

  return (
    <GameContext.Provider value={{ games, players, sessions, addGame, addPlayer, addSession, isLoading }}>
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
