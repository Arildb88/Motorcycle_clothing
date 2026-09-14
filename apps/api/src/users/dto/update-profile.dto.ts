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
  DISTANCE_UNITS,
  MOTORCYCLE_CATEGORIES,
  SPEED_UNITS,
  TEMPERATURE_UNITS,
  WIND_PROTECTION_LEVELS,
  WIND_SPEED_UNITS,
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

  /** Temperature display (legacy field). Engine stays Celsius. */
  @IsOptional()
  @IsIn([...TEMPERATURE_UNITS])
  units?: string;

  @IsOptional()
  @IsIn([...DISTANCE_UNITS])
  distanceUnit?: string;

  @IsOptional()
  @IsIn([...SPEED_UNITS])
  speedUnit?: string;

  @IsOptional()
  @IsIn([...WIND_SPEED_UNITS])
  windSpeedUnit?: string;

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
