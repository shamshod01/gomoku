import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ethers } from 'ethers';
import { UserService } from '../user/user.service';
import { SignMessageDto, VerifySignatureDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async getSignMessage(walletAddress: string): Promise<string> {
    const nonce = Math.random().toString(36).substring(2, 15);
    const message = `Sign this message to authenticate with Gomoku Game. Nonce: ${nonce}`;
    
    // Store nonce for verification
    await this.userService.updateNonce(walletAddress, nonce);
    
    return message;
  }

  async verifySignature(verifySignatureDto: VerifySignatureDto): Promise<any> {
    const { walletAddress, signature, message } = verifySignatureDto;
    
    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Get or create user
      let user = await this.userService.findByWalletAddress(walletAddress);
      
      if (!user) {
        user = await this.userService.create({
          walletAddress,
          username: `Player_${walletAddress.slice(0, 6)}`,
        });
      }

      // Generate JWT token
      const payload = { 
        sub: user.id, 
        walletAddress: user.walletAddress,
        username: user.username 
      };
      
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          balance: user.balance,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Signature verification failed');
    }
  }
}
