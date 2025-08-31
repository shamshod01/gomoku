import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Game } from '../game/entities/game.entity';
import { GameMove } from '../game/entities/game-move.entity';
import { config } from 'dotenv';
config();

export const DatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Game, GameMove],
  synchronize: true, // Only for development
  logging: true,
};
