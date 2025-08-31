import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Game } from '../../game/entities/game.entity';

export enum UserRole {
  PLAYER = 'player',
  SPECTATOR = 'spectator',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ nullable: true })
  username: string;

  @Column({ default: 0 })
  balance: number;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  draws: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PLAYER,
  })
  role: UserRole;

  @Column({ nullable: true })
  nonce: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Game, (game) => game.player1)
  gamesAsPlayer1: Game[];

  @OneToMany(() => Game, (game) => game.player2)
  gamesAsPlayer2: Game[];
}
