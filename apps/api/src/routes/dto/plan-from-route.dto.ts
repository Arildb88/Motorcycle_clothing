import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

/** Create an ActivityPlan from a saved Route (fresh weather later; no cached rec). */
export class PlanFromRouteDto {
  /** ISO datetime. Defaults to now when omitted. */
  @IsOptional()
  @IsDateString()
  departureAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMin?: number;
}
