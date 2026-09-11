import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ACTIVITY_TYPES, GARMENT_CATEGORIES } from '../../domain';

export class UpdateGarmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn([...GARMENT_CATEGORIES])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  warmthTier?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  windResistTier?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  waterResistTier?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  breathabilityTier?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...ACTIVITY_TYPES], { each: true })
  activityTags?: string[];
}
