import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WaypointDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateRouteDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isDefaultCommute?: boolean;

  @IsNumber()
  startLat!: number;

  @IsNumber()
  startLon!: number;

  @IsOptional()
  @IsString()
  startLabel?: string;

  @IsNumber()
  endLat!: number;

  @IsNumber()
  endLon!: number;

  @IsOptional()
  @IsString()
  endLabel?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints?: WaypointDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  typicalDurationMin?: number;
}
