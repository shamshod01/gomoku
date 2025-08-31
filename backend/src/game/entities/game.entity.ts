import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { GameMove } from './game-move.entity';

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum GameResult {
  PLAYER1_WIN = 'player1_win',
  PLAYER2_WIN = 'player2_win',
  DRAW = 'draw',
  CANCELLED = 'cancelled',
}

@Entity()
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  betAmount: number;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.WAITING,
  })
  status: GameStatus;

  @Column({
    type: 'enum',
    enum: GameResult,
    nullable: true,
  })
  result: GameResult;

  @Column({ nullable: true })
  winnerId: string;

  @Column({ default: 15 })
  boardSize: number;

  @Column({ default: 5 })
  winCondition: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'player1Id' })
  player1: User;

  @Column()
  player1Id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'player2Id' })
  player2: User;

  @Column({ nullable: true })
  player2Id: string;

  @Column({ default: 'player1' })
  currentTurn: string;

  @Column({ type: 'text', default: '[]' })
  boardState: string; // JSON string of the board

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GameMove, (move) => move.game)
  moves: GameMove[];
}
