import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  codeVerifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  redirectUri?: string;
}

export class OAuthStartDto {
  @IsIn(['facebook', 'microsoft'])
  provider!: 'facebook' | 'microsoft';
}
