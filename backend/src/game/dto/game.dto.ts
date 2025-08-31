import { IsNumber, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateGameDto {
  @IsNumber()
  betAmount: number;

  @IsString()
  @IsUUID()
  player1Id: string;
}

export class JoinGameDto {
  @IsString()
  @IsUUID()
  gameId: string;

  @IsString()
  @IsUUID()
  player2Id: string;
}

export class MakeMoveDto {
  @IsString()
  @IsUUID()
  gameId: string;

  @IsString()
  @IsUUID()
  playerId: string;

  @IsNumber()
  row: number;

  @IsNumber()
  col: number;
}

export class GameResponseDto {
  id: string;
  betAmount: number;
  status: string;
  result?: string;
  winnerId?: string;
  boardSize: number;
  winCondition: number;
  player1: any;
  player2?: any;
  currentTurn: string;
  boardState: number[][];
  createdAt: Date;
  updatedAt: Date;
}
