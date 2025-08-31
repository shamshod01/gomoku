'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import axios from 'axios';
import GameBoard from '../../../components/GameBoard';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import { Game } from '../../../types';

const API_BASE_URL = 'http://localhost:3001';

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const { user, login } = useAuth();
  const { socket, joinGame: joinGameRoom, leaveGame: leaveGameRoom } = useSocket();
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  // WebSocket listeners for game updates
  useEffect(() => {
    if (!socket || !game) return;

    const handlePlayerJoinedGame = (updatedGame: Game) => {
      console.log('Player joined game (game page):', updatedGame);
      setGame(updatedGame);
    };

    socket.on('playerJoinedGame', handlePlayerJoinedGame);

    return () => {
      socket.off('playerJoinedGame', handlePlayerJoinedGame);
    };
  }, [socket, game]);

  // Join game room when user is available and game is loaded
  useEffect(() => {
    if (user && game?.id) {
      joinGameRoom(game.id);
      
      return () => {
        leaveGameRoom(game.id);
      };
    }
  }, [user, game?.id, joinGameRoom, leaveGameRoom]);

  const fetchGame = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/game/${gameId}`);
      setGame(response.data);
    } catch (error) {
      setError('Game not found or you do not have access');
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
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

  const joinGame = async () => {
    if (!user || !game) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/game/join`, {
        gameId: game.id,
        player2Id: user.id,
      });

      const updatedGame = response.data;
      setGame(updatedGame);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/" className="text-blue-500 hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Game Not Found</h1>
          <p className="text-gray-600 mb-6">The game you're looking for doesn't exist.</p>
          <a href="/" className="text-blue-500 hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Join Game</h1>
            
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">Game Details</h2>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600">Game ID</p>
                  <p className="font-semibold">{game.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bet Amount</p>
                  <p className="font-semibold text-green-600">{game.betAmount} tokens</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created by</p>
                  <p className="font-semibold">{game.player1.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-yellow-600">Waiting for player</p>
                </div>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              Connect your MetaMask wallet to join this game and start playing!
            </p>
            
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-lg font-semibold"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is connected and game is ready, show the game board
  if (game.status === 'waiting' && !game.player2) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Join Game</h1>
            
            <div className="bg-green-50 p-6 rounded-lg mb-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">Ready to Join!</h2>
              <p className="text-gray-700 mb-4">
                You're about to join a game with <strong>{game.player1.username}</strong> 
                for <strong>{game.betAmount} tokens</strong>.
              </p>
              <p className="text-sm text-gray-600">
                Make sure you have enough balance to cover the bet amount.
              </p>
            </div>

            <button
              onClick={() => joinGame()}
              className="px-8 py-3 bg-secondary text-white rounded-lg hover:bg-green-600 text-lg font-semibold"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show the game board
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
            <a
              href="/"
              className="btn-secondary text-sm sm:text-base"
            >
              <span className="hidden sm:inline">← Back to Home</span>
              <span className="sm:hidden">← Back</span>
            </a>
          </div>
          <div className="divider-ornament"></div>
          <GameBoard game={game} user={user} />
        </div>
      </div>
    </div>
  );
}
