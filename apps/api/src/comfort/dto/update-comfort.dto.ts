import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateComfortDto {
  @IsOptional()
  @IsNumber()
  @Min(-20)
  @Max(30)
  glovesBelowC?: number;

  @IsOptional()
  @IsNumber()
  @Min(-20)
  @Max(30)
  extraJacketLayerBelowC?: number;

  @IsOptional()
  @IsNumber()
  @Min(-20)
  @Max(30)
  extraPantsLayerBelowC?: number;

  @IsOptional()
  @IsNumber()
  @Min(-20)
  @Max(30)
  woolBaseBelowC?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rainProbThreshold?: number;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  windChillSensitivity?: string;
}
