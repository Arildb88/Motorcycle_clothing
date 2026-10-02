import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class NearbyTrailsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;
}
