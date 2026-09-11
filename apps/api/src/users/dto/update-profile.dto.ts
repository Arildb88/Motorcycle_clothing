import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MOTORCYCLE_CATEGORIES,
  WIND_PROTECTION_LEVELS,
} from '../../domain';

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

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1)
  coldSensitivity?: number;

  @IsOptional()
  @IsIn([...MOTORCYCLE_CATEGORIES])
  motorcycleCategory?: string;

  @IsOptional()
  @IsIn([...WIND_PROTECTION_LEVELS])
  windProtection?: string;
}
