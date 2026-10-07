import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

/** Plan one commute day. Times are Europe/Oslo clock times, not stored forecasts. */
export class CommutePlanDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  outboundTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  returnTime!: string;

  /** Overnight shift: return clock is on the next civil day in Europe/Oslo. */
  @IsOptional()
  @IsBoolean()
  returnNextDay?: boolean;
}
