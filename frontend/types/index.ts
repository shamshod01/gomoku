export interface User {
  id: string;
  walletAddress: string;
  username: string;
  balance: number;
  xp?: number;
  wins?: number;
  losses?: number;
  draws?: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  walletAddress: string;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface Game {
  id: string;
  betAmount: number;
  status: string;
  result?: string;
  winnerId?: string;
  boardSize: number;
  winCondition: number;
  player1: User;
  player2?: User;
  currentTurn: string;
  boardState: number[][]; // Now always an array from backend
  createdAt: Date;
  updatedAt: Date;
}

export interface GameMove {
  id: string;
  row: number;
  col: number;
  player: number;
  gameId: string;
  userId: string;
}
