import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PLANNING_MODES } from '../../domain';

/** Provider-neutral routing preferences (language-neutral flags). */
export class RoutePreferencesDto {
  @IsOptional()
  @IsBoolean()
  avoidMotorways?: boolean;

  @IsOptional()
  @IsBoolean()
  avoidTolls?: boolean;

  @IsOptional()
  @IsBoolean()
  avoidFerries?: boolean;
}

/** Create an ActivityPlan from a saved Route (fresh weather later; no cached rec). */
export class PlanFromRouteDto {
  /**
   * Language-neutral planning mode: departure | arrival.
   * Defaults to departure.
   */
  @IsOptional()
  @IsIn([...PLANNING_MODES])
  planningMode?: string;

  /** ISO datetime when planningMode=departure (defaults to now). */
  @IsOptional()
  @IsDateString()
  departureAt?: string;

  /** ISO datetime when planningMode=arrival (defaults to now). */
  @IsOptional()
  @IsDateString()
  arrivalAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMin?: number;

  /**
   * Optional one-off preference override for this plan (does not mutate Route).
   * When omitted, Route.preferencesJson is snapshotted.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => RoutePreferencesDto)
  preferences?: RoutePreferencesDto;
}
