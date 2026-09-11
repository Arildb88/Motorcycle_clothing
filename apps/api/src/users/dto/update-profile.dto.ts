import {
  IsArray,
  IsBoolean,
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
import { SELECTABLE_ACTIVITIES } from '../../domain/oauth-utils';

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
  @IsIn(['en', 'nb'])
  preferredLanguage?: string | null;

  @IsOptional()
  @IsString()
  defaultRouteId?: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1)
  coldSensitivity?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1)
  heatSensitivity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  sweatTendency?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsIn([...SELECTABLE_ACTIVITIES])
  defaultActivity?: string;

  @IsOptional()
  @IsBoolean()
  showActivityChooserOnLaunch?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn([...SELECTABLE_ACTIVITIES], { each: true })
  interestedActivities?: string[];

  @IsOptional()
  @IsIn([...MOTORCYCLE_CATEGORIES])
  motorcycleCategory?: string;

  @IsOptional()
  @IsIn([...WIND_PROTECTION_LEVELS])
  windProtection?: string;
}
