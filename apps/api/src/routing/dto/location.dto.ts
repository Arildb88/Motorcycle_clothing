import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PreviewWaypointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;
}

export class RoutePreviewDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PreviewWaypointDto)
  waypoints!: PreviewWaypointDto[];

  @IsOptional()
  @IsBoolean()
  avoidMotorways?: boolean;
}

export class ResolvePlaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  providerPlaceId!: string;
}
