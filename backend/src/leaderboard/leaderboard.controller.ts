import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const users = await this.userService.getLeaderboard(limit);
    
    // Add rank to each user
    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
      winRate: user.wins + user.losses > 0 
        ? Math.round((user.wins / (user.wins + user.losses)) * 100) 
        : 0,
    }));
  }
}