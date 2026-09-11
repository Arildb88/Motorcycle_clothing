import { SHORT_EXTREME } from './constants';
import {
  motorcycleExposureC,
  warmthDemandFromExposureC,
  waterDemandFromPoint,
  windDemandFromPoint,
} from './exposure';
import type { RideSegment } from './types';
import type { RouteWeatherSummary, WeatherPoint } from '../weather.types';

function isShortExtreme(
  durationMin: number,
  totalMin: number,
  warmthDemand: number,
  sustainedWarmth: number,
): boolean {
  if (warmthDemand <= sustainedWarmth) return false;
  if (durationMin <= SHORT_EXTREME.maxAbsoluteMin) return true;
  if (totalMin <= 0) return false;
  return durationMin / totalMin <= SHORT_EXTREME.maxFractionOfRide;
}

/**
 * Build duration-aware ride segments from route weather samples.
 * Multiple points without explicit per-leg durations share ride time evenly
 * so richer sampling can be added later without rewriting the engine.
 */
export function buildRideSegments(input: {
  weather: RouteWeatherSummary;
  rideDurationMin: number;
  cruiseKmh?: number;
  personalColdBiasC?: number;
}): RideSegment[] {
  const totalMin = Math.max(1, Math.round(input.rideDurationMin));
  const cruise = input.cruiseKmh;
  const points: WeatherPoint[] =
    input.weather.points.length > 0
      ? input.weather.points
      : [
          {
            lat: 0,
            lon: 0,
            airTempC: (input.weather.minTempC + input.weather.maxTempC) / 2,
            precipitationProbPct: input.weather.maxRainProbPct,
            precipitationMm: input.weather.maxPrecipMm,
            windSpeedMs: input.weather.maxWindMs,
          },
        ];

  const per = totalMin / points.length;
  const raw = points.map((weather, index) => {
    const motorcycleExposureCValue = motorcycleExposureC(weather, {
      cruiseKmh: cruise,
      personalColdBiasC: input.personalColdBiasC,
    });
    const durationMin = Math.max(1, Math.round(per));
    return {
      index,
      durationMin,
      fraction: durationMin / totalMin,
      weather,
      motorcycleExposureC: motorcycleExposureCValue,
      warmthDemand: warmthDemandFromExposureC(motorcycleExposureCValue),
      windDemand: windDemandFromPoint(weather, cruise ?? 70),
      waterDemand: waterDemandFromPoint(weather),
    };
  });

  // Normalize fractions after rounding.
  const sumDur = raw.reduce((s, r) => s + r.durationMin, 0);
  const sustainedWarmth = durationWeightedMean(
    raw.map((r) => ({ value: r.warmthDemand, weight: r.durationMin })),
  );

  return raw.map((r) => ({
    ...r,
    fraction: r.durationMin / sumDur,
    isShortExtreme: isShortExtreme(
      r.durationMin,
      sumDur,
      r.warmthDemand,
      Math.round(sustainedWarmth),
    ),
  }));
}

export function durationWeightedMean(
  parts: Array<{ value: number; weight: number }>,
): number {
  const total = parts.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return parts[0]?.value ?? 0;
  return parts.reduce((s, p) => s + p.value * p.weight, 0) / total;
}
