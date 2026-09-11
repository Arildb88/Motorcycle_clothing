import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFeedbackDto {
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
