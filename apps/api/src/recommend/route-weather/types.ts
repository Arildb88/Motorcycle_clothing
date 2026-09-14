/**
 * Provider-neutral route weather timeline (v1).
 *
 * Route analysis → sample positions + ETAs → weather observations → timeline.
 * Motorcycle exposure consumes normalized samples — never provider SDKs.
 *
 * Find My Best Time must reuse this same pipeline via analyzeRideAt(time),
 * not a separate approximation engine.
 */

import type { PlanningMode } from '../../domain/ride-planning';

export const ROUTE_WEATHER_TIMELINE_VERSION = 1 as const;

/** Sampling strategy id — refine later without changing sample contract. */
export const ROUTE_WEATHER_SAMPLE_STRATEGY = 'bounded_v1' as const;

export type RouteWeatherTimingSource =
  | 'travel_segment'
  | 'linear_distance'
  | 'fallback_even';

export type RouteWeatherSample = {
  index: number;
  coordinate: { lat: number; lon: number };
  distanceFromStartM: number;
  /** 0..1 along route distance. */
  progress: number;
  /** ISO-8601 expected arrival at this sample (UTC). */
  expectedAt: string;
  /** Minutes from effective departure. */
  offsetMin: number;
  airTempC: number | null;
  windSpeedMs: number | null;
  windFromDeg?: number | null;
  gustMs?: number | null;
  precipitationProbability?: number | null;
  precipitationMm?: number | null;
  conditionCode?: string | null;
  /** Travel heading at/near this sample when known. */
  headingDeg?: number | null;
  /** True when weather lookup failed for this sample. */
  weatherMissing?: boolean;
  timingSource: RouteWeatherTimingSource;
  timeInterpolated?: boolean;
  source?: string;
};

export type RouteWeatherTimelineMeta = {
  provider: string;
  strategy: typeof ROUTE_WEATHER_SAMPLE_STRATEGY | string;
  sampleCount: number;
  maxSamples: number;
  partial: boolean;
  timingFallbackUsed: boolean;
  /** Language-neutral reason codes for confidence / explainability. */
  reasonCodes: string[];
  builtAt: string;
};

export type RouteWeatherTimeline = {
  version: typeof ROUTE_WEATHER_TIMELINE_VERSION;
  planningMode: PlanningMode;
  departureAt: string;
  arrivalAt: string;
  durationMin: number;
  distanceM: number;
  samples: RouteWeatherSample[];
  meta: RouteWeatherTimelineMeta;
};

/**
 * Compact summary safe to persist on ActivityPlan / WeatherSnapshot.
 * Omits dense geometry and raw provider payloads.
 */
export type RouteWeatherTimelineSummaryV1 = {
  version: 1;
  planningMode: PlanningMode;
  departureAt: string;
  arrivalAt: string;
  durationMin: number;
  sampleCount: number;
  provider: string;
  partial: boolean;
  timingFallbackUsed: boolean;
  reasonCodes: string[];
  /** Coarse ordered samples for history / future charts (not GPS traces). */
  samples: Array<{
    progress: number;
    offsetMin: number;
    expectedAt: string;
    airTempC: number | null;
    windSpeedMs: number | null;
    windFromDeg?: number | null;
    precipitationProbability?: number | null;
    precipitationMm?: number | null;
    conditionCode?: string | null;
    weatherMissing?: boolean;
  }>;
};

export function toRouteWeatherTimelineSummary(
  timeline: RouteWeatherTimeline,
): RouteWeatherTimelineSummaryV1 {
  return {
    version: 1,
    planningMode: timeline.planningMode,
    departureAt: timeline.departureAt,
    arrivalAt: timeline.arrivalAt,
    durationMin: timeline.durationMin,
    sampleCount: timeline.samples.length,
    provider: timeline.meta.provider,
    partial: timeline.meta.partial,
    timingFallbackUsed: timeline.meta.timingFallbackUsed,
    reasonCodes: [...timeline.meta.reasonCodes],
    samples: timeline.samples.map((s) => ({
      progress: s.progress,
      offsetMin: s.offsetMin,
      expectedAt: s.expectedAt,
      airTempC: s.airTempC,
      windSpeedMs: s.windSpeedMs,
      windFromDeg: s.windFromDeg,
      precipitationProbability: s.precipitationProbability,
      precipitationMm: s.precipitationMm,
      conditionCode: s.conditionCode,
      weatherMissing: s.weatherMissing,
    })),
  };
}
