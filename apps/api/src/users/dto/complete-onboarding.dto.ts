import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { SELECTABLE_ACTIVITIES } from '../../domain/oauth-utils';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsArray()
  @IsIn([...SELECTABLE_ACTIVITIES], { each: true })
  interestedActivities?: string[];

  @IsOptional()
  @IsIn([...SELECTABLE_ACTIVITIES])
  defaultActivity?: string;

  @IsOptional()
  @IsBoolean()
  showActivityChooserOnLaunch?: boolean;

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(1)
  coldSensitivity?: number;
}
