import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignMessageDto, VerifySignatureDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('sign-message/:walletAddress')
  async getSignMessage(@Param('walletAddress') walletAddress: string) {
    const message = await this.authService.getSignMessage(walletAddress);
    return { message };
  }

  @Post('verify-signature')
  async verifySignature(@Body() verifySignatureDto: VerifySignatureDto) {
    return this.authService.verifySignature(verifySignatureDto);
  }
}
