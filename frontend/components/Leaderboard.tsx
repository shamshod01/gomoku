'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { LeaderboardEntry } from '../types';

const API_BASE_URL = 'http://localhost:3001';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/leaderboard?limit=10`);
      setLeaderboard(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getXPLevel = (xp: number) => {
    if (xp < 100) return { level: 1, title: 'Novice', color: 'var(--text-secondary)' };
    if (xp < 500) return { level: 2, title: 'Beginner', color: '#22c55e' };
    if (xp < 1000) return { level: 3, title: 'Intermediate', color: '#3b82f6' };
    if (xp < 2500) return { level: 4, title: 'Advanced', color: '#a855f7' };
    if (xp < 5000) return { level: 5, title: 'Expert', color: '#f97316' };
    if (xp < 10000) return { level: 6, title: 'Master', color: '#ef4444' };
    return { level: 7, title: 'Grandmaster', color: 'var(--accent-gold)' };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-2 mx-auto" 
               style={{ borderColor: 'var(--wood-primary)', borderTopColor: 'transparent' }}></div>
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--accent-red)' }}>{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--text-secondary)' }}>No players on the leaderboard yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Leaderboard Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          🏆 Top Players
        </h3>
        <button
          onClick={fetchLeaderboard}
          className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded"
          style={{
            background: 'rgba(212, 165, 116, 0.1)',
            color: 'var(--wood-primary)',
            border: '1px solid var(--wood-primary)'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const levelInfo = getXPLevel(entry.xp);
          const rankIcon = getRankIcon(entry.rank);

          return (
            <div
              key={entry.id}
              className={`p-3 sm:p-4 rounded-lg transition-all ${
                entry.rank <= 3 ? 'hover:shadow-lg' : 'hover:shadow-md'
              }`}
              style={{
                background: entry.rank === 1 
                  ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(212, 165, 116, 0.1))'
                  : entry.rank <= 3 
                    ? 'linear-gradient(135deg, rgba(139, 111, 71, 0.1), rgba(139, 111, 71, 0.05))'
                    : 'linear-gradient(135deg, #faf6f0, #f5e6d3)',
                border: entry.rank === 1 
                  ? '2px solid var(--accent-gold)' 
                  : '1px solid var(--wood-primary)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Rank and Player Info */}
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                       style={{ 
                         background: entry.rank <= 3 ? 'var(--wood-primary)' : 'rgba(139, 111, 71, 0.2)',
                         color: entry.rank <= 3 ? 'white' : 'var(--text-primary)'
                       }}>
                    <span className="text-sm sm:text-base font-bold">
                      {rankIcon || entry.rank}
                    </span>
                  </div>

                  {/* Player Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                        {entry.username}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              background: levelInfo.color, 
                              color: 'white',
                              fontWeight: 500
                            }}>
                        {levelInfo.title}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
                  <div className="text-center">
                    <p className="font-bold" style={{ color: 'var(--accent-gold)' }}>{entry.xp}</p>
                    <p style={{ color: 'var(--text-secondary)' }}>XP</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {entry.wins}-{entry.losses}-{entry.draws}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>W-L-D</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold" style={{ 
                      color: entry.winRate >= 60 ? '#22c55e' : 
                             entry.winRate >= 40 ? 'var(--text-primary)' : 
                             '#ef4444' 
                    }}>
                      {entry.winRate}%
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>Win Rate</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* XP System Info */}
      <div className="mt-6 p-3 rounded-lg text-xs sm:text-sm" style={{
        background: 'rgba(212, 165, 116, 0.05)',
        border: '1px solid var(--wood-primary)'
      }}>
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          📈 XP System
        </p>
        <ul className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li>• Win: 100 XP + bonus based on bet amount</li>
          <li>• Draw: 50 XP</li>
          <li>• Loss: 10 XP (participation reward)</li>
        </ul>
      </div>
    </div>
  );
}