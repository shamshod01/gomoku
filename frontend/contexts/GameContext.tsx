'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Game } from '../types';

interface GameContextType {
  currentGame: Game | null;
  setCurrentGame: (game: Game | null) => void;
  gameLink: string;
  setGameLink: (link: string) => void;
  betAmount: number;
  setBetAmount: (amount: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [gameLink, setGameLink] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(10);

  const value: GameContextType = {
    currentGame,
    setCurrentGame,
    gameLink,
    setGameLink,
    betAmount,
    setBetAmount,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
