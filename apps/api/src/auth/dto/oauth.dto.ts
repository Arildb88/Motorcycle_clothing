import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class OAuthDto {
  @IsIn(['facebook', 'microsoft'])
  provider!: 'facebook' | 'microsoft';

  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  accessToken!: string;
}
