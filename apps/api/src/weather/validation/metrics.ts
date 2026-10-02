import { MOTORCYCLE_EXPOSURE } from '../../recommend/motorcycle/constants';
import {
  motorcycleExposureC,
  warmthDemandFromExposureC,
} from '../../recommend/motorcycle/exposure';
import type { WeatherPoint } from '../../recommend/weather.types';

export function finiteNumber(
  value: number | null | undefined,
): value is number {
  return value != null && Number.isFinite(value);
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function temperatureError(
  pairs: Array<{ forecastC: number; observedC: number }>,
): { n: number; mae: number | null; meanBias: number | null } {
  const errors = pairs.map((pair) => pair.forecastC - pair.observedC);
  return {
    n: pairs.length,
    mae: mean(errors.map((error) => Math.abs(error))),
    meanBias: mean(errors),
  };
}

export function windError(
  pairs: Array<{ forecastMs: number; observedMs: number }>,
): { n: number; mae: number | null } {
  return {
    n: pairs.length,
    mae: mean(pairs.map((pair) => Math.abs(pair.forecastMs - pair.observedMs))),
  };
}

/** Yes means the motorcycle wet threshold. Probability is not an input. */
export function precipitationOccurrenceMismatches(
  pairs: Array<{ forecastMm: number; observedMm: number }>,
): { n: number; mismatches: number } {
  const threshold = MOTORCYCLE_EXPOSURE.precipMmWetThreshold;
  let mismatches = 0;
  for (const pair of pairs) {
    const forecastYes = pair.forecastMm >= threshold;
    const observedYes = pair.observedMm >= threshold;
    if (forecastYes !== observedYes) mismatches += 1;
  }
  return { n: pairs.length, mismatches };
}

/**
 * Warmth-tier disagreements from the existing motorcycle exposure function.
 * Personal bias is 0. Wind direction is not supplied, so the scalar path is used.
 */
export function countDemandTierMismatches(
  pairs: Array<{ forecast: WeatherPoint; observed: WeatherPoint }>,
): number {
  let mismatches = 0;
  for (const pair of pairs) {
    const forecastTier = warmthDemandFromExposureC(
      motorcycleExposureC(pair.forecast, { personalColdBiasC: 0 }),
    );
    const observedTier = warmthDemandFromExposureC(
      motorcycleExposureC(pair.observed, { personalColdBiasC: 0 }),
    );
    if (forecastTier !== observedTier) mismatches += 1;
  }
  return mismatches;
}

/** Nearest-rank percentile. p is 50 or 95. Empty input returns null. */
export function nearestRankPercentile(
  values: number[],
  percentile: number,
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((percentile / 100) * sorted.length);
  const index = Math.min(sorted.length, Math.max(1, rank)) - 1;
  return sorted[index];
}

export function share(count: number, total: number): number | null {
  if (total === 0) return null;
  return count / total;
}
