import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto, JoinGameDto, MakeMoveDto, GameResponseDto } from './dto/game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  private transformGameToResponse(game: any): GameResponseDto {
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

  @Post('create')
  async createGame(@Body() createGameDto: CreateGameDto) {
    const game = await this.gameService.createGame(createGameDto);
    return this.transformGameToResponse(game);
  }

  @Post('join')
  async joinGame(@Body() joinGameDto: JoinGameDto) {
    const game = await this.gameService.joinGame(joinGameDto);
    return this.transformGameToResponse(game);
  }

  @Post('move')
  async makeMove(@Body() makeMoveDto: MakeMoveDto) {
    const game = await this.gameService.makeMove(makeMoveDto);
    return this.transformGameToResponse(game);
  }

  @Get(':id')
  async getGame(@Param('id') id: string) {
    const game = await this.gameService.getGame(id);
    return this.transformGameToResponse(game);
  }

  @Get('waiting/list')
  async getWaitingGames() {
    const games = await this.gameService.getWaitingGames();
    return games.map(game => this.transformGameToResponse(game));
  }
}
