import type { WeatherPoint } from '../weather.types';
import {
  CYCLING_EXPOSURE,
  CYCLING_METABOLIC_OFFSET_C,
  CYCLING_WARMTH_BELOW_C,
  type CyclingIntensity,
} from './constants';
import type { CyclingAirflowMode } from './types';

/**
 * Apparent airflow for a cyclist.
 *
 * Vector mode only when both travel heading and meteorological wind-from
 * are present. Otherwise scalar speed plus wind. Direction is never invented.
 * There is no motorcycle wind-protection factor.
 */
export function cyclingApparentAirflow(input: {
  speedKmh: number;
  windSpeedMs: number;
  windFromDeg?: number | null;
  headingDeg?: number | null;
}): { apparentAirflowMs: number; mode: CyclingAirflowMode } {
  const speedMs = Math.max(0, input.speedKmh) / 3.6;
  const windMs = Math.max(0, input.windSpeedMs);
  const hasDirection =
    input.windFromDeg != null &&
    Number.isFinite(input.windFromDeg) &&
    input.headingDeg != null &&
    Number.isFinite(input.headingDeg);

  if (!hasDirection) {
    return {
      apparentAirflowMs: round1(speedMs + windMs),
      mode: 'scalar_sum',
    };
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const windTowardDeg = (Number(input.windFromDeg) + 180) % 360;
  const heading = Number(input.headingDeg);
  const vx = speedMs * Math.cos(toRad(heading));
  const vy = speedMs * Math.sin(toRad(heading));
  const wx = windMs * Math.cos(toRad(windTowardDeg));
  const wy = windMs * Math.sin(toRad(windTowardDeg));
  return {
    apparentAirflowMs: round1(Math.hypot(vx - wx, vy - wy)),
    mode: 'vector',
  };
}

/**
 * Cycling exposure °C. Metabolic heat is added. Wind chill uses cycling
 * coefficients on apparent airflow. Personal motorcycle offsets are not applied.
 */
export function cyclingExposureC(
  point: WeatherPoint,
  input: { apparentAirflowMs: number; intensity: CyclingIntensity },
): number {
  const above = Math.max(
    0,
    input.apparentAirflowMs - CYCLING_EXPOSURE.windThresholdMs,
  );
  const chill = above * CYCLING_EXPOSURE.windChillPerMs;
  const wet =
    point.precipitationMm >= CYCLING_EXPOSURE.precipMmWetThreshold ||
    point.precipitationProbPct >= CYCLING_EXPOSURE.rainProbWetThreshold
      ? CYCLING_EXPOSURE.wetExposurePenaltyC
      : 0;
  const value =
    point.airTempC + CYCLING_METABOLIC_OFFSET_C[input.intensity] - chill - wet;
  return round1(value);
}

export function cyclingWarmthDemand(exposureC: number): number {
  if (exposureC < CYCLING_WARMTH_BELOW_C.extreme) return 5;
  if (exposureC < CYCLING_WARMTH_BELOW_C.veryCold) return 4;
  if (exposureC < CYCLING_WARMTH_BELOW_C.cold) return 3;
  if (exposureC < CYCLING_WARMTH_BELOW_C.cool) return 2;
  return 1;
}

export function cyclingWindDemand(apparentAirflowMs: number): number {
  if (apparentAirflowMs < 3) return 1;
  if (apparentAirflowMs < 6) return 2;
  if (apparentAirflowMs < 9) return 3;
  if (apparentAirflowMs < 13) return 4;
  return 5;
}

export function cyclingWaterDemand(point: WeatherPoint): number {
  const prob = point.precipitationProbPct;
  const mm = point.precipitationMm;
  if (prob >= 70 || mm >= 1) return 5;
  if (prob >= 50 || mm >= 0.5) return 4;
  if (prob >= 30 || mm >= 0.2) return 3;
  if (prob >= 15 || mm > 0) return 2;
  return 1;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
