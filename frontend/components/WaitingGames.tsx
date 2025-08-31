'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Game } from '../types';

const API_BASE_URL = 'http://localhost:3001';

interface WaitingGamesProps {
  onJoinGame: (gameId: string) => void;
}

export default function WaitingGames({ onJoinGame }: WaitingGamesProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitingGames();
    const interval = setInterval(fetchWaitingGames, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchWaitingGames = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/game/waiting/list`);
      setGames(response.data);
    } catch (error) {
      console.error('Error fetching waiting games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-2 mx-auto" 
               style={{ borderColor: 'var(--wood-primary)', borderTopColor: 'transparent' }}></div>
        </div>
        <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Loading game rooms...</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12 px-8 rounded-lg" style={{ 
        background: 'rgba(212, 165, 116, 0.05)',
        border: '1px dashed var(--wood-primary)'
      }}>
        <div className="mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--wood-primary)', opacity: 0.5 }}/>
            <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--wood-primary)', opacity: 0.5 }}/>
          </svg>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>No game rooms available</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          Create a new game room to start playing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div key={game.id} className="p-3 sm:p-4 rounded-lg transition-all hover:shadow-md" style={{ 
          background: 'linear-gradient(135deg, #faf6f0, #f5e6d3)',
          border: '1px solid var(--wood-primary)'
        }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Room #{game.id.slice(0, 8)}
                </span>
                <span className="status-badge text-xs">
                  Waiting for opponent
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="stone-indicator black-stone">
                  <div className="stone-inner" />
                </div>
                <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {game.player1.username}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>💰 {game.betAmount} tokens</span>
                <span>🕐 {game.createdAt ? new Date(game.createdAt).toLocaleTimeString() : 'Unknown'}</span>
              </div>
            </div>
            <button
              onClick={() => onJoinGame(game.id)}
              className="btn-primary w-full sm:w-auto"
            >
              Join Room
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
