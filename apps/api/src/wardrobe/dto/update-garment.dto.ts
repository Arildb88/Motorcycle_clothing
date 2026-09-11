import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ACTIVITY_TYPES,
  GARMENT_CATEGORIES,
  GARMENT_COMPONENT_KINDS,
  GARMENT_MATERIALS,
} from '../../domain';
import { GarmentComponentInputDto } from './create-garment.dto';

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
  @IsIn([...GARMENT_MATERIALS])
  material?: string | null;

  @IsOptional()
  @IsBoolean()
  hasVentilation?: boolean;

  @IsOptional()
  @IsBoolean()
  isHeated?: boolean;

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

  /** When provided, replaces the full component list. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GarmentComponentInputDto)
  components?: GarmentComponentInputDto[];
}

export { GarmentComponentInputDto };
