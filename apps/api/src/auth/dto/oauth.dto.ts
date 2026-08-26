import { IsIn, IsString, MinLength } from 'class-validator';

export class OAuthDto {
  @IsIn(['facebook', 'microsoft'])
  provider!: 'facebook' | 'microsoft';

  @IsString()
  @MinLength(1)
  accessToken!: string;
}
