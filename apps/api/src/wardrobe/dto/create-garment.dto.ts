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

export class GarmentComponentInputDto {
  @IsIn([...GARMENT_COMPONENT_KINDS])
  kind!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(-4)
  @Max(4)
  warmthDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(-4)
  @Max(4)
  windResistDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(-4)
  @Max(4)
  waterResistDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(-4)
  @Max(4)
  breathabilityDelta?: number;
}

export class CreateGarmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn([...GARMENT_CATEGORIES])
  category!: string;

  /** Optional UX preset id (mesh_jacket, winter_gloves, …). */
  @IsOptional()
  @IsString()
  preset?: string;

  @IsOptional()
  @IsIn([...GARMENT_MATERIALS])
  material?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GarmentComponentInputDto)
  components?: GarmentComponentInputDto[];
}
