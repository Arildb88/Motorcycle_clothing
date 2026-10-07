import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ACTIVITY_TYPES, GARMENT_CATEGORIES, GARMENT_MATERIALS } from '../../domain';

const LINER_KINDS = ['thermal_liner', 'waterproof_liner', 'other'] as const;

export class CataloguePreviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  /** Lookup only. Never stored on a catalogue row. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsIn([...GARMENT_CATEGORIES])
  category!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...ACTIVITY_TYPES], { each: true })
  activityTags?: string[];

  @IsOptional()
  @IsBoolean()
  isHeated?: boolean;

  @IsOptional()
  @IsIn([...GARMENT_MATERIALS])
  material?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...LINER_KINDS], { each: true })
  linerKinds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  preset?: string;
}

export class CatalogueContributionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  brand!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  model!: string;

  @IsIn([...GARMENT_CATEGORIES])
  category!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...ACTIVITY_TYPES], { each: true })
  activityTags?: string[];

  @IsOptional()
  @IsBoolean()
  isHeated?: boolean;

  @IsOptional()
  @IsIn([...GARMENT_MATERIALS])
  material?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...LINER_KINDS], { each: true })
  linerKinds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  warmth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  wind?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  water?: number;

  @IsArray()
  @ArrayUnique()
  @IsIn(['warmth', 'wind', 'water'], { each: true })
  explicitMetrics!: string[];

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9_-]+$/)
  submissionId!: string;

  /** Checked for demo ownership, then discarded. Not written to shared rows. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  garmentId?: string;
}
