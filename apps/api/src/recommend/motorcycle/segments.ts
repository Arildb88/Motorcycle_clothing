import { MOTORCYCLE_EXPOSURE, SHORT_EXTREME } from './constants';
import {
  motorcycleExposureC,
  warmthDemandFromExposureC,
  waterDemandFromPoint,
  windDemandFromPoint,
  apparentAirflowForPoint,
} from './exposure';
import type { RideSegment } from './types';
import type { SpeedSource } from './route-travel';
import type { RouteTravelSegment } from './route-travel';
import {
  associateWeatherIndex,
  durationWeightedSpeedKmh,
} from './route-travel';
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

function fallbackWeatherPoints(
  weather: RouteWeatherSummary,
): WeatherPoint[] {
  if (weather.points.length > 0) return weather.points;
  return [
    {
      lat: 0,
      lon: 0,
      airTempC: (weather.minTempC + weather.maxTempC) / 2,
      precipitationProbPct: weather.maxRainProbPct,
      precipitationMm: weather.maxPrecipMm,
      windSpeedMs: weather.maxWindMs,
    },
  ];
}

function finalizeSegments(
  raw: Array<Omit<RideSegment, 'fraction' | 'isShortExtreme'>>,
): RideSegment[] {
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

function buildSegmentRow(input: {
  index: number;
  durationMin: number;
  weather: WeatherPoint;
  expectedSpeedKmh: number;
  speedSource: SpeedSource;
  personalColdBiasC?: number;
  headingDeg?: number | null;
}): Omit<RideSegment, 'fraction' | 'isShortExtreme'> {
  const airflow = apparentAirflowForPoint(input.weather, {
    expectedSpeedKmh: input.expectedSpeedKmh,
    personalColdBiasC: input.personalColdBiasC,
    headingDeg: input.headingDeg,
  });
  const motorcycleExposureCValue = motorcycleExposureC(input.weather, {
    expectedSpeedKmh: input.expectedSpeedKmh,
    personalColdBiasC: input.personalColdBiasC,
    headingDeg: input.headingDeg,
  });
  return {
    index: input.index,
    durationMin: input.durationMin,
    weather: input.weather,
    expectedSpeedKmh: input.expectedSpeedKmh,
    speedSource: input.speedSource,
    apparentAirflowMs: Math.round(airflow.apparentAirflowMs * 100) / 100,
    airflowMode: airflow.mode,
    motorcycleExposureC: motorcycleExposureCValue,
    warmthDemand: warmthDemandFromExposureC(motorcycleExposureCValue),
    windDemand: windDemandFromPoint(input.weather, input.expectedSpeedKmh, {
      headingDeg: input.headingDeg,
      personalColdBiasC: input.personalColdBiasC,
    }),
    waterDemand: waterDemandFromPoint(input.weather),
  };
}

/**
 * Build duration-aware ride segments.
 *
 * Prefer `routeTravelSegments` when a provider-neutral speed profile exists.
 * Weather samples are associated by cumulative duration fraction (v1 mapping).
 *
 * Without a route profile: weather points share ride duration evenly and use
 * the resolved cruise/default speed (legacy behaviour).
 */
export function buildRideSegments(input: {
  weather: RouteWeatherSummary;
  rideDurationMin: number;
  cruiseKmh?: number;
  personalColdBiasC?: number;
  routeTravelSegments?: RouteTravelSegment[];
  speedSource?: SpeedSource;
}): RideSegment[] {
  const points = fallbackWeatherPoints(input.weather);
  const profile = (input.routeTravelSegments ?? []).filter(
    (s) => s.durationMin > 0 && Number.isFinite(s.expectedSpeedKmh),
  );

  if (profile.length > 0) {
    const speedSource: SpeedSource = input.speedSource ?? 'route_profile';
    const raw = profile.map((travel, index) => {
      const wi = associateWeatherIndex(index, profile.length, points.length);
      const weather = points[wi] ?? points[0];
      return buildSegmentRow({
        index,
        durationMin: Math.max(1, Math.round(travel.durationMin)),
        weather,
        expectedSpeedKmh: travel.expectedSpeedKmh,
        speedSource,
        personalColdBiasC: input.personalColdBiasC,
        headingDeg: travel.headingDeg,
      });
    });
    return finalizeSegments(raw);
  }

  const totalMin = Math.max(1, Math.round(input.rideDurationMin));
  const speedSource: SpeedSource =
    input.speedSource ??
    (input.cruiseKmh != null && Number.isFinite(input.cruiseKmh)
      ? 'explicit_cruise'
      : 'assumed_default');
  const cruise =
    input.cruiseKmh != null && Number.isFinite(input.cruiseKmh)
      ? (input.cruiseKmh as number)
      : undefined;
  const expectedSpeedKmh = cruise ?? MOTORCYCLE_EXPOSURE.defaultCruiseKmh;

  const per = totalMin / points.length;
  const raw = points.map((weather, index) =>
    buildSegmentRow({
      index,
      durationMin: Math.max(1, Math.round(per)),
      weather,
      expectedSpeedKmh,
      speedSource,
      personalColdBiasC: input.personalColdBiasC,
    }),
  );
  return finalizeSegments(raw);
}

export function durationWeightedMean(
  parts: Array<{ value: number; weight: number }>,
): number {
  const total = parts.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return parts[0]?.value ?? 0;
  return parts.reduce((s, p) => s + p.value * p.weight, 0) / total;
}

export { durationWeightedSpeedKmh };
