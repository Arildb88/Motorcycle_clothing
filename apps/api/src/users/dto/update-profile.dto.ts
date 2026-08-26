import { IsNumber, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsNumber()
  homeLat?: number;

  @IsOptional()
  @IsNumber()
  homeLon?: number;

  @IsOptional()
  @IsIn(['celsius', 'fahrenheit'])
  units?: string;

  @IsOptional()
  @IsString()
  defaultRouteId?: string;
}
