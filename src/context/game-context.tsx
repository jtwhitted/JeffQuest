
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Game } from '@/lib/types';
import { getGames as fetchGames, addGame as addGameAction } from '@/lib/actions';
import type { GetGameDetailsOutput } from '@/ai/flows/get-game-title-from-image';

interface GameContextType {
  games: Game[];
  addGame: (gameData: GetGameDetailsOutput) => Promise<void>;
  isLoading: boolean;
  refetchGames: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetchGames = useCallback(async () => {
    setIsLoading(true);
    try {
        const updatedGames = await fetchGames();
        setGames(updatedGames);
    } catch (error) {
        console.error("Failed to refetch games:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    refetchGames();
  }, [refetchGames]);

  const addGame = useCallback(async (gameData: GetGameDetailsOutput) => {
    const newGame = await addGameAction(gameData);
    setGames(prevGames => [...prevGames, newGame]);
  }, []);

  return (
    <GameContext.Provider value={{ games, addGame, isLoading, refetchGames }}>
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
