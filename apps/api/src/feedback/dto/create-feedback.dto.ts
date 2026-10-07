import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ACTIVITY_TYPES, THERMAL_RATINGS } from '../../domain';

/** Optional torso and legs ratings. Omitted zones are not learned. */
export class ZoneFeedbackDto {
  @IsOptional()
  @IsIn([...THERMAL_RATINGS])
  torso?: string;

  @IsOptional()
  @IsIn([...THERMAL_RATINGS])
  legs?: string;
}

export class CreateFeedbackDto {
  @IsIn([...ACTIVITY_TYPES])
  activityType!: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  /** Activity plan for this leg. A second submission for the same plan is rejected. */
  @IsOptional()
  @IsString()
  planId?: string;

  @IsDateString()
  departureAt!: string;

  @IsObject()
  weatherSnapshot!: Record<string, unknown>;

  @IsObject()
  recommendation!: Record<string, unknown>;

  @IsIn(['too_cold', 'slightly_cold', 'ok', 'slightly_warm', 'too_warm'])
  rating!: string;

  /** Optional. Each zone is learned on its own offset, not copied from rating. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneFeedbackDto)
  zones?: ZoneFeedbackDto;

  @IsOptional()
  @IsArray()
  wornItems?: string[];

  /**
   * Actual worn configuration, only when the rider recorded it.
   * Never filled from the recommendation.
   */
  @IsOptional()
  @IsArray()
  wornConfiguration?: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
