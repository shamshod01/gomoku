import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Game } from './game.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class GameMove {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  row: number;

  @Column()
  col: number;

  @Column()
  player: string; // 'player1' or 'player2'

  @ManyToOne(() => Game, { nullable: false })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column()
  gameId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
