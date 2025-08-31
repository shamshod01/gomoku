import { IsString, IsNotEmpty } from 'class-validator';

export class SignMessageDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class VerifySignatureDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class AuthResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  user: any;
}
