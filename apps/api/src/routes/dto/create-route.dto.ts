import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ROUTE_CATEGORIES, ROUTE_KINDS, WAYPOINT_TYPES } from '../../domain';

export class RouteWaypointInputDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsIn([...WAYPOINT_TYPES])
  waypointType?: string;
}

export class CreateRouteDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsIn([...ROUTE_KINDS])
  routeKind?: string;

  @IsOptional()
  @IsIn([...ROUTE_CATEGORIES])
  category?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultCommute?: boolean;

  /**
   * Ordered waypoints (canonical). Min 2.
   * When provided, start/end are derived from first/last.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RouteWaypointInputDto)
  waypoints?: RouteWaypointInputDto[];

  /** Legacy convenience — used when waypoints omitted. */
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLon?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  startLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLon?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  endLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  typicalDurationMin?: number;
}
