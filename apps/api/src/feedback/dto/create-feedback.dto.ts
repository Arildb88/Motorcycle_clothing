import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ACTIVITY_TYPES } from '../../domain';

export class CreateFeedbackDto {
  @IsIn([...ACTIVITY_TYPES])
  activityType!: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsDateString()
  departureAt!: string;

  @IsObject()
  weatherSnapshot!: Record<string, unknown>;

  @IsObject()
  recommendation!: Record<string, unknown>;

  @IsIn(['too_cold', 'slightly_cold', 'ok', 'slightly_warm', 'too_warm'])
  rating!: string;

  @IsOptional()
  @IsArray()
  wornItems?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
