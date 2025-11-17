
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { Game, Player, Session } from '@/lib/types';
import { 
    addGame as addGameAction,
    addPlayer as addPlayerAction, 
    addSession as addSessionAction, 
    deleteGame as deleteGameAction, 
    deletePlayer as deletePlayerAction, 
    deleteSessionAction, 
    updatePlayerAction,
    setFavoriteVideoAction,
    importBggPlayHistory,
} from '@/lib/actions';
import { getInitialData } from '@/lib/data';


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

type PlayerUpdateData = Partial<Pick<Player, 'name' | 'avatarUrl' | 'legendaryTitle' | 'legendaryBio' | 'bggUsername'>>;
type GameUpdateData = Partial<Game>;


interface GameContextType {
  games: Game[];
  players: Player[];
  sessions: Session[];
  addGame: (gameData: GameData) => Promise<Game>;
  updateGame: (gameId: string, gameData: GameUpdateData) => void;
  addPlayer: (playerData: { name: string; avatarUrl?: string; bggUsername?: string }) => Promise<Player>;
  updatePlayer: (playerId: string, playerData: PlayerUpdateData) => Promise<Player>;
  addSession: (sessionData: any) => Promise<Session>;
  deleteGame: (gameId: string) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  setFavoriteVideo: (gameId: string, videoId: string | undefined) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: React.ReactNode;
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

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
        const newData = await getInitialData();
        setGames(newData.games);
        setPlayers(newData.players);
        setSessions(newData.sessions);
    } catch (error) {
        console.error("Failed to refresh data:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

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

  const updateGame = useCallback((gameId: string, gameData: GameUpdateData) => {
    setGames(prevGames => prevGames.map(g => g.id === gameId ? { ...g, ...gameData } : g));
  }, []);

  const addPlayer = useCallback(async (playerData: { name: string; avatarUrl?: string; bggUsername?: string }) => {
    setIsLoading(true);
    try {
      const newPlayer = await addPlayerAction(playerData);
      setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
      return newPlayer;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePlayer = useCallback(async (playerId: string, playerData: PlayerUpdateData) => {
    setIsLoading(true);
    try {
        const updatedPlayer = await updatePlayerAction(playerId, playerData);
        setPlayers(prevPlayers => prevPlayers.map(p => p.id === playerId ? { ...p, ...updatedPlayer} : p));
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

  const setFavoriteVideo = useCallback(async (gameId: string, videoId: string | undefined) => {
    // Optimistic UI update
    const originalGames = games;
    setGames(prevGames => prevGames.map(g => 
        g.id === gameId ? { ...g, favoriteVideoId: videoId } : g
    ));
    try {
        await setFavoriteVideoAction(gameId, videoId);
    } catch (error) {
        console.error("Failed to set favorite video:", error);
        // Revert UI on error
        setGames(originalGames);
        throw error; // Re-throw so the component can handle it
    }
  }, [games]);


  return (
    <GameContext.Provider value={{ games, players, sessions, addGame, updateGame, addPlayer, updatePlayer, addSession, deleteGame, deletePlayer, deleteSession, isLoading, refreshData, setFavoriteVideo }}>
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
