'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import GameBoard from '../components/GameBoard';
import WaitingGames from '../components/WaitingGames';
import Leaderboard from '../components/Leaderboard';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}

const API_BASE_URL = 'http://localhost:3001';

export default function Home() {
  const { user, login, logout } = useAuth();
  const { currentGame, setCurrentGame, gameLink, setGameLink, betAmount, setBetAmount } = useGame();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    console.log(window.ethereum);
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // Get sign message from backend
      const response = await axios.get(`${API_BASE_URL}/auth/sign-message/${account}`);
      const message = response.data.message;

      // Sign the message
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // Verify signature with backend
      const authResponse = await axios.post(`${API_BASE_URL}/auth/verify-signature`, {
        walletAddress: account,
        signature,
        message,
      });

      const { accessToken, user: userData } = authResponse.data;
      
      // Use context to login
      login(accessToken, userData);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const createGame = async () => {
    if (!user) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/game/create`, {
        betAmount,
        player1Id: user.id,
      });

      const game = response.data;
      setCurrentGame(game);
      setGameLink(`${window.location.origin}/game/${game.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    if (!user) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/game/join`, {
        gameId,
        player2Id: user.id,
      });

      const game = response.data;
      setCurrentGame(game);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game');
    }
  };

  const disconnect = () => {
    logout();
    setCurrentGame(null);
    setGameLink('');
  };

  if (currentGame) {
    return (
      <div className="min-h-screen paper-texture p-2 sm:p-4">
        <div className="max-w-6xl mx-auto">
          <div className="game-card relative p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: 'var(--text-primary)' }}>
                  五目並べ
                </h1>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Gomoku - Five in a Row</p>
              </div>
              <button
                onClick={() => setCurrentGame(null)}
                className="btn-secondary text-sm sm:text-base"
              >
                <span className="hidden sm:inline">← Back to Lobby</span>
                <span className="sm:hidden">← Back</span>
              </button>
            </div>
            <div className="divider-ornament"></div>
            <GameBoard game={currentGame} user={user} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-texture p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="game-card relative p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3" style={{ color: 'var(--text-primary)' }}>
              五目並べ
            </h1>
            <p className="text-sm sm:text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Gomoku - Traditional Five in a Row
            </p>
          </div>
          
          <div className="divider-ornament"></div>
          
          {!user ? (
            <div>
              <div className="text-center py-12">
                <div className="mb-8">
                  <div className="inline-block p-4 rounded-full" style={{ background: 'rgba(139, 111, 71, 0.1)' }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--wood-primary)' }}/>
                      <circle cx="8" cy="10" r="1.5" fill="currentColor" style={{ color: 'var(--wood-primary)' }}/>
                      <circle cx="16" cy="10" r="1.5" fill="currentColor" style={{ color: 'var(--wood-primary)' }}/>
                      <path d="M8 15C8 15 10 17 12 17C14 17 16 15 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--wood-primary)' }}/>
                    </svg>
                  </div>
                </div>
                <p className="mb-8 text-lg" style={{ color: 'var(--text-secondary)' }}>
                  Connect your MetaMask wallet to enter the game room
                </p>
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="btn-primary text-lg"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
              
              <div className="divider-ornament"></div>
              
              {/* Show leaderboard even when not logged in */}
              <div>
                <Leaderboard />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Player Info */}
              <div className="player-card">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Welcome, {user.username}
                    </h2>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                        <span>💰</span>
                        <span className="font-medium">{user.balance} tokens</span>
                      </p>
                      {user.xp !== undefined && (
                        <p className="flex items-center gap-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                          <span>⭐</span>
                          <span className="font-medium">{user.xp} XP</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span>🔗</span>
                        <span className="break-all sm:break-normal">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={disconnect}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded whitespace-nowrap" 
                    style={{ 
                      background: 'rgba(139, 44, 44, 0.1)',
                      color: 'var(--accent-red)',
                      border: '1px solid var(--accent-red)'
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="divider-ornament"></div>

              {/* Create Game */}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
                  Create New Game Room
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4">
                  <label className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Bet Amount:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      min="1"
                      max={user.balance}
                      className="game-input w-20 sm:w-24 text-sm sm:text-base"
                    />
                    <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>tokens</span>
                  </div>
                </div>
                <button
                  onClick={createGame}
                  disabled={betAmount > user.balance}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  Create Game Room
                </button>
                {gameLink && (
                  <div className="mt-4 p-3 rounded" style={{ background: 'rgba(212, 165, 116, 0.1)', border: '1px solid var(--accent-gold)' }}>
                    <p className="text-xs sm:text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Share this link with your opponent:</p>
                    <code className="text-xs break-all" style={{ color: 'var(--wood-primary)' }}>{gameLink}</code>
                  </div>
                )}
              </div>

              <div className="divider-ornament"></div>

              {/* Join Games */}
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
                  Available Game Rooms
                </h3>
                <WaitingGames onJoinGame={joinGame} />
              </div>

              <div className="divider-ornament"></div>

              {/* Leaderboard */}
              <div>
                <Leaderboard />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
