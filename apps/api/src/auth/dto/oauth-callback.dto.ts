import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  state!: string;

  @IsOptional()
  @IsString()
  codeVerifier?: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class OAuthStartDto {
  @IsIn(['facebook', 'microsoft'])
  provider!: 'facebook' | 'microsoft';
}
