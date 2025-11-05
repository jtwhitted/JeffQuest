'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Game } from '@/lib/types';
import { getGames as fetchGames } from '@/lib/data';
import { addGame as addGameAction } from '@/lib/actions';
import type { GetGameDetailsOutput } from '@/ai/flows/get-game-title-from-image';

interface GameContextType {
  games: Game[];
  addGame: (gameData: GetGameDetailsOutput) => Promise<Game | null>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      setIsLoading(true);
      const initialGames = await fetchGames();
      setGames(initialGames);
      setIsLoading(false);
    }
    loadGames();
  }, []);

  const addGame = useCallback(async (gameData: GetGameDetailsOutput) => {
    const newGame = await addGameAction(gameData);
    if (newGame) {
      setGames((prevGames) => [...prevGames, newGame]);
    }
    return newGame;
  }, []);

  return (
    <GameContext.Provider value={{ games, addGame, isLoading }}>
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
