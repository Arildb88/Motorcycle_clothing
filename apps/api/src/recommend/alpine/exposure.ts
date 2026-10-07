import {
  precipitationProbAtLeast,
  type WeatherPoint,
} from '../weather.types';
import {
  ALPINE_EXPOSURE,
  ALPINE_EXPOSURE_MODES,
  ALPINE_HIKE_EXTRA_WIND_MS,
  ALPINE_METABOLIC_OFFSET_C,
  ALPINE_WARMTH_BELOW_C,
  type AlpineExposureMode,
} from './constants';

/**
 * Stationary mountain exposure. Travel speed is not an input: a one-minute
 * descent does not set the outfit, and motorcycle airflow is not reused.
 * personalColdBiasC is this discipline's own shrunk feedback. Zero leaves
 * the exposure unchanged. Alpine skiing and snowboarding do not share it.
 */
export function alpineExposureC(
  point: WeatherPoint,
  mode: AlpineExposureMode,
  personalColdBiasC = 0,
): number {
  const windMs =
    Math.max(0, point.windSpeedMs) +
    (mode === 'hike' ? ALPINE_HIKE_EXTRA_WIND_MS : 0);
  const above = Math.max(0, windMs - ALPINE_EXPOSURE.windThresholdMs);
  const chill = above * ALPINE_EXPOSURE.windChillPerMs;
  const wet =
    point.precipitationMm >= ALPINE_EXPOSURE.precipMmWetThreshold ||
    precipitationProbAtLeast(
      point.precipitationProbPct,
      ALPINE_EXPOSURE.rainProbWetThreshold,
    )
      ? ALPINE_EXPOSURE.wetExposurePenaltyC
      : 0;
  const bias = finiteBias(personalColdBiasC);
  return round1(
    point.airTempC + ALPINE_METABOLIC_OFFSET_C[mode] - chill - wet - bias,
  );
}

export function alpineWarmthDemand(exposureC: number): number {
  if (exposureC < ALPINE_WARMTH_BELOW_C.extreme) return 5;
  if (exposureC < ALPINE_WARMTH_BELOW_C.veryCold) return 4;
  if (exposureC < ALPINE_WARMTH_BELOW_C.cold) return 3;
  if (exposureC < ALPINE_WARMTH_BELOW_C.cool) return 2;
  return 1;
}

export function alpineWindDemand(windMs: number): number {
  const wind = Math.max(0, windMs);
  if (wind < 3) return 1;
  if (wind < 6) return 2;
  if (wind < 10) return 3;
  if (wind < 15) return 4;
  return 5;
}

export function alpineWaterDemand(point: WeatherPoint): number {
  const prob = point.precipitationProbPct;
  const mm = point.precipitationMm;
  if (precipitationProbAtLeast(prob, 70) || mm >= 1) return 5;
  if (precipitationProbAtLeast(prob, 50) || mm >= 0.5) return 4;
  if (precipitationProbAtLeast(prob, 30) || mm >= 0.2) return 3;
  if (precipitationProbAtLeast(prob, 15) || mm > 0) return 2;
  return 1;
}

export function parseExposureMode(value?: string | null): {
  mode: AlpineExposureMode;
  assumed: boolean;
} {
  const text = (value ?? '').trim().toLowerCase();
  if (text === 'lift' || text === 'groomer' || text === 'groomers') {
    return { mode: 'lift', assumed: false };
  }
  if (text === 'hike' || text === 'sidecountry') {
    return { mode: 'hike', assumed: false };
  }
  if (text === 'base' || text === 'village') {
    return { mode: 'base', assumed: false };
  }
  if ((ALPINE_EXPOSURE_MODES as readonly string[]).includes(text)) {
    return { mode: text as AlpineExposureMode, assumed: false };
  }
  return { mode: 'lift', assumed: true };
}

function finiteBias(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
