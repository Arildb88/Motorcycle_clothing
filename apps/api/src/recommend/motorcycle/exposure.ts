import { DEMAND_FROM_EXPOSURE_C, MOTORCYCLE_EXPOSURE } from './constants';
import type { WeatherPoint } from '../weather.types';

/**
 * Motorcycle exposure temperature (°C) — explainable engineering proxy,
 * not a medically exact human "feels like".
 *
 * cooling =
 *   wind chill above threshold
 *   + assumed cruising airflow chill
 *   + wet-exposure penalty when precip/rain-prob exceeds thresholds
 *
 * motorcycleExposureC = airTempC - cooling - personalColdBiasC
 */
export function motorcycleExposureC(
  point: WeatherPoint,
  options?: {
    cruiseKmh?: number;
    personalColdBiasC?: number;
  },
): number {
  const cruise =
    options?.cruiseKmh ?? MOTORCYCLE_EXPOSURE.defaultCruiseKmh;
  const bias = options?.personalColdBiasC ?? 0;

  const windAbove = Math.max(
    0,
    point.windSpeedMs - MOTORCYCLE_EXPOSURE.windThresholdMs,
  );
  const windChill = windAbove * MOTORCYCLE_EXPOSURE.windChillPerMs;

  const airflowAbove = Math.max(0, cruise - 30);
  const airflowChill =
    (airflowAbove / 10) * MOTORCYCLE_EXPOSURE.airflowChillPer10Kmh;

  const wet =
    point.precipitationMm >= MOTORCYCLE_EXPOSURE.precipMmWetThreshold ||
    point.precipitationProbPct >= MOTORCYCLE_EXPOSURE.rainProbWetThreshold
      ? MOTORCYCLE_EXPOSURE.wetExposurePenaltyC
      : 0;

  return point.airTempC - windChill - airflowChill - wet - bias;
}

export function warmthDemandFromExposureC(exposureC: number): number {
  if (exposureC < DEMAND_FROM_EXPOSURE_C.extremeBelowC) return 5;
  if (exposureC < DEMAND_FROM_EXPOSURE_C.veryColdBelowC) return 4;
  if (exposureC < DEMAND_FROM_EXPOSURE_C.coldBelowC) return 3;
  if (exposureC < DEMAND_FROM_EXPOSURE_C.coolBelowC) return 2;
  if (exposureC < DEMAND_FROM_EXPOSURE_C.mildAboveC) return 2;
  return 1;
}

export function windDemandFromPoint(
  point: WeatherPoint,
  cruiseKmh: number,
): number {
  const airflow = point.windSpeedMs + cruiseKmh / 3.6;
  if (airflow >= 25) return 5;
  if (airflow >= 18) return 4;
  if (airflow >= 12) return 3;
  if (airflow >= 6) return 2;
  return 1;
}

export function waterDemandFromPoint(point: WeatherPoint): number {
  if (
    point.precipitationMm >= 0.8 ||
    point.precipitationProbPct >= 55
  ) {
    return 4;
  }
  if (
    point.precipitationMm >= 0.2 ||
    point.precipitationProbPct >= 35
  ) {
    return 3;
  }
  if (
    point.precipitationMm > 0 ||
    point.precipitationProbPct >= 25
  ) {
    return 2;
  }
  return 1;
}
