import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateNonce(walletAddress: string, nonce: string): Promise<void> {
    await this.userRepository.update({ walletAddress }, { nonce });
  }

  async updateBalance(userId: string, amount: number): Promise<void> {
    await this.userRepository.update({ id: userId }, { balance: amount });
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.findById(userId);
    return user?.balance || 0;
  }

  async updateStats(userId: string, result: 'win' | 'loss' | 'draw', xpGained: number = 0): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const updates: Partial<User> = {
      xp: user.xp + xpGained,
    };

    if (result === 'win') {
      updates.wins = user.wins + 1;
    } else if (result === 'loss') {
      updates.losses = user.losses + 1;
    } else if (result === 'draw') {
      updates.draws = user.draws + 1;
    }

    await this.userRepository.update({ id: userId }, updates);
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return this.userRepository.find({
      order: {
        xp: 'DESC',
        wins: 'DESC',
      },
      take: limit,
      select: ['id', 'username', 'walletAddress', 'xp', 'wins', 'losses', 'draws'],
    });
  }
}
