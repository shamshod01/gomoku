'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Game } from '../types';
import { useSocket } from '../contexts/SocketContext';

const API_BASE_URL = 'http://localhost:3001';

interface GameBoardProps {
  game: Game;
  user: User | null;
}

export default function GameBoard({ game, user }: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  
  // Helper function to ensure board is always an array
  const ensureBoardIsArray = (boardState: any): number[][] => {
    if (typeof boardState === 'string') {
      try {
        return JSON.parse(boardState);
      } catch (error) {
        console.error('Error parsing board state:', error);
        return Array(15).fill(null).map(() => Array(15).fill(0));
      }
    }
    return Array.isArray(boardState) ? boardState : Array(15).fill(null).map(() => Array(15).fill(0));
  };

  const [board, setBoard] = useState<number[][]>(ensureBoardIsArray(game.boardState));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameStatus, setGameStatus] = useState(game.status);
  const [currentGame, setCurrentGame] = useState<Game>(game);
  const { socket, joinGame: joinGameRoom, leaveGame: leaveGameRoom } = useSocket();

  // Calculate board scale for mobile
  useEffect(() => {
    const calculateScale = () => {
      if (typeof window === 'undefined') return;
      
      const viewportWidth = window.innerWidth;
      const containerPadding = 80; // Total padding around board
      const availableWidth = Math.min(viewportWidth - containerPadding, 600);
      const scale = availableWidth / 600;
      
      setBoardScale(Math.min(scale, 1)); // Never scale up, only down
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  useEffect(() => {
    console.log(game);
    setBoard(ensureBoardIsArray(game.boardState));
    setGameStatus(game.status);
    setCurrentGame(game);
    
    // Only set turn state if user is defined
    if (user) {
      setIsMyTurn(
        (game.currentTurn === 'player1' && game.player1.id === user.id) ||
        (game.currentTurn === 'player2' && game.player2?.id === user.id)
      );
    } else {
      setIsMyTurn(false);
    }
  }, [game, user]);

  // Join game room when component mounts
  useEffect(() => {
    if (user && game.id) {
      joinGameRoom(game.id);
      
      return () => {
        leaveGameRoom(game.id);
      };
    }
  }, [game.id, user, joinGameRoom, leaveGameRoom]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    const handlePlayerJoinedGame = (updatedGame: Game) => {
      console.log('Player joined game:', updatedGame);
      setCurrentGame(updatedGame);
      setBoard(ensureBoardIsArray(updatedGame.boardState));
      setGameStatus(updatedGame.status);
      
      if (user) {
        setIsMyTurn(
          (updatedGame.currentTurn === 'player1' && updatedGame.player1.id === user.id) ||
          (updatedGame.currentTurn === 'player2' && updatedGame.player2?.id === user.id)
        );
      }
    };

    const handleMoveMade = (updatedGame: Game) => {
      console.log('Move made:', updatedGame);
      setCurrentGame(updatedGame);
      setBoard(ensureBoardIsArray(updatedGame.boardState));
      setGameStatus(updatedGame.status);
      
      if (user) {
        setIsMyTurn(
          (updatedGame.currentTurn === 'player1' && updatedGame.player1.id === user.id) ||
          (updatedGame.currentTurn === 'player2' && updatedGame.player2?.id === user.id)
        );
      }
    };

    const handleGameStatusChange = (updatedGame: Game) => {
      console.log('Game status changed:', updatedGame);
      setCurrentGame(updatedGame);
      setBoard(ensureBoardIsArray(updatedGame.boardState));
      setGameStatus(updatedGame.status);
      
      // Show game end notification
      if (updatedGame.status === 'finished') {
        if (updatedGame.result === 'player1_win') {
          alert(`Game Over! ${updatedGame.player1.username} wins ${updatedGame.betAmount * 2} tokens!`);
        } else if (updatedGame.result === 'player2_win') {
          alert(`Game Over! ${updatedGame.player2?.username} wins ${updatedGame.betAmount * 2} tokens!`);
        } else if (updatedGame.result === 'draw') {
          alert('Game Over! It\'s a draw. Bet amounts returned to both players.');
        }
      }
    };

    socket.on('playerJoinedGame', handlePlayerJoinedGame);
    socket.on('moveMade', handleMoveMade);
    socket.on('gameStatusChange', handleGameStatusChange);

    return () => {
      socket.off('playerJoinedGame', handlePlayerJoinedGame);
      socket.off('moveMade', handleMoveMade);
      socket.off('gameStatusChange', handleGameStatusChange);
    };
  }, [socket, user]);

  const handleCellClick = async (row: number, col: number) => {
    if (!isMyTurn || gameStatus !== 'playing' || board[row][col] !== 0 || !user) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/game/move`, {
        gameId: game.id,
        playerId: user.id,
        row,
        col,
      });

      const updatedGame = response.data;
      setBoard(ensureBoardIsArray(updatedGame.boardState));
      setGameStatus(updatedGame.status);
      
      if (user) {
        setIsMyTurn(
          (updatedGame.currentTurn === 'player1' && updatedGame.player1.id === user.id) ||
          (updatedGame.currentTurn === 'player2' && updatedGame.player2?.id === user.id)
        );
      }

      // Check if game is finished
      if (updatedGame.status === 'finished') {
        if (updatedGame.result === 'player1_win' || updatedGame.result === 'player2_win') {
          const winner = updatedGame.result === 'player1_win' ? updatedGame.player1 : updatedGame.player2;
          alert(`Game Over! ${winner.username} wins ${updatedGame.betAmount * 2} tokens!`);
        } else if (updatedGame.result === 'draw') {
          alert('Game Over! It\'s a draw. Bet amounts returned to both players.');
        }
      }
    } catch (error) {
      console.error('Error making move:', error);
      alert('Failed to make move');
    }
  };

  const getPlayerInfo = (playerType: 'player1' | 'player2') => {
    const player = playerType === 'player1' ? currentGame.player1 : currentGame.player2;
    if (!player) return null;

    const isCurrentTurn = currentGame.currentTurn === playerType;
    const isMe = user ? player.id === user.id : false;

    return (
      <div className={`player-card ${isCurrentTurn ? 'active' : ''}`}>
        <div className="flex items-center space-x-3 mb-2">
          <div className={`stone-indicator ${playerType === 'player1' ? 'black-stone' : 'white-stone'}`}>
            <div className="stone-inner" />
          </div>
          <div>
            <span className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
              {player.username}
            </span>
            {isMe && <span className="text-xs sm:text-sm ml-1 sm:ml-2" style={{ color: 'var(--text-secondary)' }}>(You)</span>}
          </div>
        </div>
        <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          Balance: {player.balance} tokens
        </p>
        {isCurrentTurn && (
          <div className="mt-2">
            <span className="status-badge text-xs">Active Turn</span>
          </div>
        )}
      </div>
    );
  };

  const getGameStatusText = () => {
    if (gameStatus === 'waiting') {
      return 'Waiting for player 2 to join...';
    } else if (gameStatus === 'playing') {
      return isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
    } else if (gameStatus === 'finished') {
      if (currentGame.result === 'player1_win') {
        return `Game Over! ${currentGame.player1.username} wins!`;
      } else if (currentGame.result === 'player2_win') {
        return `Game Over! ${currentGame.player2?.username} wins!`;
      } else if (currentGame.result === 'draw') {
        return 'Game Over! It\'s a draw!';
      }
    }
    return '';
  };

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Game Info */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Game Room #{currentGame.id.slice(0, 8)}
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="block sm:inline">Stake: {currentGame.betAmount} tokens</span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline">Prize Pool: {currentGame.betAmount * 2} tokens</span>
            </p>
          </div>
          <div className="text-left sm:text-center">
            <p className="text-base sm:text-lg font-semibold" style={{
              color: gameStatus === 'playing' ? 'var(--accent-gold)' : 
                     gameStatus === 'finished' ? 'var(--wood-primary)' : 'var(--text-secondary)'
            }}>
              {getGameStatusText()}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {getPlayerInfo('player1')}
          {getPlayerInfo('player2')}
        </div>
      </div>

      {/* Game Board */}
      <div className="gomoku-board-wrapper" ref={boardRef}>
        <div className="gomoku-board-container">
          <div className="gomoku-board" style={{ width: `${600 * boardScale}px`, height: `${600 * boardScale}px` }}>
            {/* Grid lines */}
            <svg className="board-grid" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" style={{ transform: `scale(${boardScale})`, transformOrigin: 'top left' }}>
              {/* Horizontal lines */}
              {Array.from({ length: 15 }, (_, i) => (
                <line
                  key={`h-${i}`}
                  x1="20"
                  y1={20 + i * 40}
                  x2="580"
                  y2={20 + i * 40}
                  stroke="#2a1810"
                  strokeWidth="1"
                />
              ))}
              {/* Vertical lines */}
              {Array.from({ length: 15 }, (_, i) => (
                <line
                  key={`v-${i}`}
                  x1={20 + i * 40}
                  y1="20"
                  x2={20 + i * 40}
                  y2="580"
                  stroke="#2a1810"
                  strokeWidth="1"
                />
              ))}
              {/* Star points (traditional Gomoku board markers) */}
              {[
                [3, 3], [3, 7], [3, 11],
                [7, 3], [7, 7], [7, 11],
                [11, 3], [11, 7], [11, 11]
              ].map(([row, col]) => (
                <circle
                  key={`star-${row}-${col}`}
                  cx={20 + col * 40}
                  cy={20 + row * 40}
                  r="3"
                  fill="#2a1810"
                />
              ))}
            </svg>
            
            {/* Stones */}
            <div className="stones-container" style={{ transform: `scale(${boardScale})`, transformOrigin: 'top left' }}>
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const basePosition = 20;
                  const spacing = 40;
                  
                  return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="stone-position"
                    style={{
                      left: `${basePosition + colIndex * spacing}px`,
                      top: `${basePosition + rowIndex * spacing}px`,
                    }}
                  >
                    {cell === 0 ? (
                      <button
                        className="stone-placement"
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        disabled={!isMyTurn || gameStatus !== 'playing'}
                      />
                    ) : (
                      <div className={`stone ${cell === 1 ? 'black-stone' : 'white-stone'}`}>
                        <div className="stone-inner" />
                      </div>
                    )}
                  </div>
                )})
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Rules */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(212, 165, 116, 0.1), rgba(139, 111, 71, 0.05))',
        border: '1px solid var(--wood-primary)'
      }}>
        <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>Game Rules</h3>
        <ul className="text-xs sm:text-sm space-y-1 sm:space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Connect 5 stones in a row (horizontal, vertical, or diagonal) to win</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Black stones (先手) play first, White stones (後手) play second</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Take turns placing stones on the board intersections</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Winner takes the entire prize pool</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
