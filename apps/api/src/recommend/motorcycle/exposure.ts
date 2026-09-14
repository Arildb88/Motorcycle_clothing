import { DEMAND_FROM_EXPOSURE_C, MOTORCYCLE_EXPOSURE } from './constants';
import {
  computeApparentAirflow,
  type ApparentAirflow,
} from './airflow';
import type { WeatherPoint } from '../weather.types';

export type ExposureOptions = {
  /**
   * Segment-specific or ride cruise speed (km/h).
   * Prefer route-profile expectedSpeedKmh when available.
   */
  cruiseKmh?: number;
  /** Alias accepted for clarity at call sites. */
  expectedSpeedKmh?: number;
  personalColdBiasC?: number;
  /** Vehicle heading (deg); enables vector airflow when windFromDeg is set. */
  headingDeg?: number | null;
  /**
   * Future MotorcycleProfile hook (windshield / fairing / hand guards).
   * Scales meteorological wind only. Not populated by this task.
   */
  windProtectionFactor?: number | null;
};

function resolveSpeedKmh(options?: ExposureOptions): number {
  if (options?.expectedSpeedKmh != null && Number.isFinite(options.expectedSpeedKmh)) {
    return options.expectedSpeedKmh as number;
  }
  if (options?.cruiseKmh != null && Number.isFinite(options.cruiseKmh)) {
    return options.cruiseKmh as number;
  }
  return MOTORCYCLE_EXPOSURE.defaultCruiseKmh;
}

function wetPenaltyC(point: WeatherPoint): number {
  return point.precipitationMm >= MOTORCYCLE_EXPOSURE.precipMmWetThreshold ||
    point.precipitationProbPct >= MOTORCYCLE_EXPOSURE.rainProbWetThreshold
    ? MOTORCYCLE_EXPOSURE.wetExposurePenaltyC
    : 0;
}

/**
 * Shared airflow used by exposure and wind demand so the two cannot disagree.
 */
export function apparentAirflowForPoint(
  point: WeatherPoint,
  options?: ExposureOptions,
): ApparentAirflow {
  return computeApparentAirflow({
    expectedSpeedKmh: resolveSpeedKmh(options),
    windSpeedMs: point.windSpeedMs,
    windFromDeg: point.windFromDeg,
    headingDeg: options?.headingDeg,
    windProtectionFactor: options?.windProtectionFactor,
  });
}

/**
 * Motorcycle exposure temperature (°C) — explainable engineering proxy,
 * not a medically exact human "feels like".
 *
 * When wind direction + heading are available, cooling uses apparent
 * (vector) airflow. Otherwise the legacy scalar split is preserved:
 *   met wind chill + cruising airflow chill
 * so existing rides without direction data do not silently change.
 *
 * motorcycleExposureC = airTempC - cooling - personalColdBiasC
 */
export function motorcycleExposureC(
  point: WeatherPoint,
  options?: ExposureOptions,
): number {
  const speedKmh = resolveSpeedKmh(options);
  const bias = options?.personalColdBiasC ?? 0;
  const wet = wetPenaltyC(point);
  const airflow = apparentAirflowForPoint(point, {
    ...options,
    expectedSpeedKmh: speedKmh,
  });

  if (airflow.mode === 'vector') {
    // Unified chill from apparent airflow (m/s) above threshold.
    const above = Math.max(
      0,
      airflow.apparentAirflowMs - MOTORCYCLE_EXPOSURE.windThresholdMs,
    );
    const chill = above * MOTORCYCLE_EXPOSURE.windChillPerMs;
    return point.airTempC - chill - wet - bias;
  }

  // Scalar fallback — keep prior explainable split (regression-stable).
  const windAbove = Math.max(
    0,
    airflow.effectiveMetWindMs - MOTORCYCLE_EXPOSURE.windThresholdMs,
  );
  const windChill = windAbove * MOTORCYCLE_EXPOSURE.windChillPerMs;
  const airflowAbove = Math.max(0, speedKmh - 30);
  const airflowChill =
    (airflowAbove / 10) * MOTORCYCLE_EXPOSURE.airflowChillPer10Kmh;
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
  options?: Omit<ExposureOptions, 'cruiseKmh' | 'expectedSpeedKmh'>,
): number {
  const airflow = apparentAirflowForPoint(point, {
    ...options,
    expectedSpeedKmh: cruiseKmh,
  });
  const ms = airflow.apparentAirflowMs;
  if (ms >= 25) return 5;
  if (ms >= 18) return 4;
  if (ms >= 12) return 3;
  if (ms >= 6) return 2;
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
