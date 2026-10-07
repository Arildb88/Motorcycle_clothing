import {
  precipitationProbAtLeast,
  type WeatherPoint,
} from '../weather.types';
import {
  XC_EXPOSURE,
  XC_METABOLIC_OFFSET_C,
  XC_WARMTH_BELOW_C,
  type XcIntensity,
} from './constants';

/**
 * XC exposure °C.
 *
 * Forecast wind only. Travel speed is not added, because a driving or
 * cycling route is not a ski track. Climbing adds metabolic heat. Motorcycle
 * offsets and alpine lift waiting are not applied. personalColdBiasC is this
 * activity's own shrunk feedback, and 0 leaves the exposure unchanged.
 */
export function xcExposureC(
  point: WeatherPoint,
  input: {
    intensity: XcIntensity;
    climbing: boolean;
    personalColdBiasC?: number;
  },
): number {
  const windMs = Math.max(0, point.windSpeedMs);
  const above = Math.max(0, windMs - XC_EXPOSURE.windThresholdMs);
  const chill = above * XC_EXPOSURE.windChillPerMs;
  const wet =
    point.precipitationMm >= XC_EXPOSURE.precipMmWetThreshold ||
    precipitationProbAtLeast(
      point.precipitationProbPct,
      XC_EXPOSURE.rainProbWetThreshold,
    )
      ? XC_EXPOSURE.wetExposurePenaltyC
      : 0;
  const metabolic =
    XC_METABOLIC_OFFSET_C[input.intensity] +
    (input.climbing ? XC_EXPOSURE.climbExtraC : 0);
  const bias = finiteBias(input.personalColdBiasC);
  return round1(point.airTempC + metabolic - chill - wet - bias);
}

export function xcWarmthDemand(exposureC: number): number {
  if (exposureC < XC_WARMTH_BELOW_C.extreme) return 5;
  if (exposureC < XC_WARMTH_BELOW_C.veryCold) return 4;
  if (exposureC < XC_WARMTH_BELOW_C.cold) return 3;
  if (exposureC < XC_WARMTH_BELOW_C.cool) return 2;
  return 1;
}

export function xcWindDemand(windSpeedMs: number): number {
  const wind = Math.max(0, windSpeedMs);
  if (wind < 3) return 1;
  if (wind < 6) return 2;
  if (wind < 9) return 3;
  if (wind < 12) return 4;
  return 5;
}

export function xcWaterDemand(point: WeatherPoint): number {
  const prob = point.precipitationProbPct;
  const mm = point.precipitationMm;
  if (precipitationProbAtLeast(prob, 70) || mm >= 1) return 5;
  if (precipitationProbAtLeast(prob, 50) || mm >= 0.5) return 4;
  if (precipitationProbAtLeast(prob, 30) || mm >= 0.2) return 3;
  if (precipitationProbAtLeast(prob, 15) || mm > 0) return 2;
  return 1;
}

/**
 * A sample is a climb only when both this height and the previous height
 * are known and the rise meets the threshold. A missing height is not
 * copied from a neighbour and is not treated as zero.
 */
export function xcSampleIsClimbing(
  elevationM: number | null | undefined,
  previousElevationM: number | null | undefined,
): boolean {
  if (elevationM == null || previousElevationM == null) return false;
  if (!Number.isFinite(elevationM) || !Number.isFinite(previousElevationM)) {
    return false;
  }
  return elevationM - previousElevationM >= XC_EXPOSURE.climbRiseM;
}

function finiteBias(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
