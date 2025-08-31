import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus, GameResult } from './entities/game.entity';
import { GameMove } from './entities/game-move.entity';
import { UserService } from '../user/user.service';
import { CreateGameDto, JoinGameDto, MakeMoveDto } from './dto/game.dto';
import { GameGateway } from './game.gateway';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameMove)
    private readonly gameMoveRepository: Repository<GameMove>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gameGateway: GameGateway,
  ) {}

  async createGame(createGameDto: CreateGameDto): Promise<Game> {
    const { betAmount, player1Id } = createGameDto;
    
    // Check if player1 has enough balance
    const player1Balance = await this.userService.getBalance(player1Id);
    if (player1Balance < betAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Deduct bet amount from player1
    await this.userService.updateBalance(player1Id, player1Balance - betAmount);

    const game = this.gameRepository.create({
      ...createGameDto,
      boardState: JSON.stringify(this.createEmptyBoard(15)),
    });

    const savedGame = await this.gameRepository.save(game);
    
    // Return with relations loaded
    return this.gameRepository.findOne({
      where: { id: savedGame.id },
      relations: ['player1', 'player2'],
    });
  }

  async joinGame(joinGameDto: JoinGameDto): Promise<Game> {
    const { gameId, player2Id } = joinGameDto;
    
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game is not available for joining');
    }

    if (game.player1Id === player2Id) {
      throw new BadRequestException('Cannot join your own game');
    }

    // Check if player2 has enough balance
    const player2Balance = await this.userService.getBalance(player2Id);
    if (player2Balance < game.betAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Deduct bet amount from player2
    await this.userService.updateBalance(player2Id, player2Balance - game.betAmount);

    game.player2Id = player2Id;
    game.status = GameStatus.PLAYING;
    game.currentTurn = 'player1';

    const savedGame = await this.gameRepository.save(game);
    
    // Return with relations loaded
    const gameWithRelations = await this.gameRepository.findOne({
      where: { id: savedGame.id },
      relations: ['player1', 'player2'],
    });

    // Notify via WebSocket that player 2 joined (transform the data)
    const transformedGame = this.transformGameData(gameWithRelations);
    this.gameGateway.notifyPlayerJoined(gameId, transformedGame);
    
    return gameWithRelations;
  }

  async makeMove(makeMoveDto: MakeMoveDto): Promise<Game> {
    const { gameId, playerId, row, col } = makeMoveDto;
    
    const game = await this.gameRepository.findOne({ 
      where: { id: gameId },
      relations: ['player1', 'player2'],
    });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException('Game is not in playing state');
    }

    // Check if it's the player's turn
    const isPlayer1 = game.player1Id === playerId;
    const isPlayer2 = game.player2Id === playerId;
    
    if (!isPlayer1 && !isPlayer2) {
      throw new BadRequestException('You are not a player in this game');
    }

    const currentPlayer = isPlayer1 ? 'player1' : 'player2';
    if (game.currentTurn !== currentPlayer) {
      throw new BadRequestException('Not your turn');
    }

    // Check if the move is valid
    const board = JSON.parse(game.boardState);
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
      throw new BadRequestException('Invalid move position');
    }

    if (board[row][col] !== 0) {
      throw new BadRequestException('Position already occupied');
    }

    // Make the move
    const playerValue = isPlayer1 ? 1 : 2;
    board[row][col] = playerValue;

    // Save the move
    const move = this.gameMoveRepository.create({
      gameId,
      userId: playerId,
      row,
      col,
      player: currentPlayer,
    });
    await this.gameMoveRepository.save(move);

    // Update game state
    game.boardState = JSON.stringify(board);
    game.currentTurn = isPlayer1 ? 'player2' : 'player1';

    // Check for win condition
    if (this.checkWin(board, row, col, playerValue)) {
      game.status = GameStatus.FINISHED;
      game.result = isPlayer1 ? GameResult.PLAYER1_WIN : GameResult.PLAYER2_WIN;
      game.winnerId = playerId;
      
      // Award the winner
      const winnerBalance = await this.userService.getBalance(playerId);
      await this.userService.updateBalance(playerId, winnerBalance + (game.betAmount * 2));
      
      // Calculate XP based on bet amount (higher stakes = more XP)
      const baseXP = 100;
      const betBonus = Math.floor(game.betAmount / 10); // 1 XP per 10 tokens bet
      const totalXP = baseXP + betBonus;
      
      // Update winner stats
      await this.userService.updateStats(playerId, 'win', totalXP);
      
      // Update loser stats
      const loserId = isPlayer1 ? game.player2Id : game.player1Id;
      await this.userService.updateStats(loserId, 'loss', 10); // Loser gets 10 XP for participation
    } else if (this.isBoardFull(board)) {
      game.status = GameStatus.FINISHED;
      game.result = GameResult.DRAW;
      
      // Return bet amounts to both players
      const player1Balance = await this.userService.getBalance(game.player1Id);
      const player2Balance = await this.userService.getBalance(game.player2Id);
      await this.userService.updateBalance(game.player1Id, player1Balance + game.betAmount);
      await this.userService.updateBalance(game.player2Id, player2Balance + game.betAmount);
      
      // Both players get XP for draw
      await this.userService.updateStats(game.player1Id, 'draw', 50);
      await this.userService.updateStats(game.player2Id, 'draw', 50);
    }

    const savedGame = await this.gameRepository.save(game);

    // Notify via WebSocket about the move and game state change (transform the data)
    const transformedGame = this.transformGameData(savedGame);
    if (savedGame.status === GameStatus.FINISHED) {
      this.gameGateway.notifyGameStatusChange(gameId, transformedGame);
    } else {
      this.gameGateway.notifyMoveMade(gameId, transformedGame);
    }

    return savedGame;
  }

  async getGame(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({ 
      where: { id: gameId },
      relations: ['player1', 'player2', 'moves'],
    });
    
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async getWaitingGames(): Promise<Game[]> {
    return this.gameRepository.find({
      where: { status: GameStatus.WAITING },
      relations: ['player1'],
    });
  }

  private createEmptyBoard(size: number): number[][] {
    return Array(size).fill(null).map(() => Array(size).fill(0));
  }

  private checkWin(board: number[][], row: number, col: number, playerValue: number): boolean {
    const directions = [
      [1, 0], [0, 1], [1, 1], [1, -1] // horizontal, vertical, diagonal down-right, diagonal down-left
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      
      // Check in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + i * dx;
        const newCol = col + i * dy;
        if (this.isValidPosition(board, newRow, newCol) && board[newRow][newCol] === playerValue) {
          count++;
        } else {
          break;
        }
      }
      
      // Check in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dx;
        const newCol = col - i * dy;
        if (this.isValidPosition(board, newRow, newCol) && board[newRow][newCol] === playerValue) {
          count++;
        } else {
          break;
        }
      }
      
      if (count >= 5) return true;
    }
    
    return false;
  }

  private isValidPosition(board: number[][], row: number, col: number): boolean {
    return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
  }

  private isBoardFull(board: number[][]): boolean {
    return board.every(row => row.every(cell => cell !== 0));
  }

  private transformGameData(game: any): any {
    return {
      id: game.id,
      betAmount: game.betAmount,
      status: game.status,
      result: game.result,
      winnerId: game.winnerId,
      boardSize: game.boardSize,
      winCondition: game.winCondition,
      player1: game.player1,
      player2: game.player2,
      currentTurn: game.currentTurn,
      boardState: typeof game.boardState === 'string' ? JSON.parse(game.boardState) : game.boardState,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }
}
