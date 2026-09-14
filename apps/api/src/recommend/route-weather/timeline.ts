/**
 * Build a time-aware route weather timeline from RouteAnalysis + WeatherPort.
 *
 * Arrival planning: resolve effective departure first (arrival − duration),
 * then walk forward in time along the route. Never sample all points at the
 * requested arrival timestamp.
 */

import { resolvePlanSchedule } from '../../domain/ride-planning';
import type { PlanningMode } from '../../domain/ride-planning';
import type { RouteAnalysis } from '../../routing/routing.types';
import type {
  WeatherObservation,
  WeatherPort,
} from '../../weather/weather.port';
import {
  ROUTE_WEATHER_SAMPLING,
  buildCumulativePath,
  interpolateAtDistance,
  selectSampleAnchors,
} from './sampling';
import {
  ROUTE_WEATHER_SAMPLE_STRATEGY,
  ROUTE_WEATHER_TIMELINE_VERSION,
  type RouteWeatherSample,
  type RouteWeatherTimeline,
  type RouteWeatherTimingSource,
} from './types';

export type BuildRouteWeatherTimelineInput = {
  analysis: RouteAnalysis;
  weatherPort: WeatherPort;
  planningMode: PlanningMode;
  /** Anchor time: departure when mode=departure, arrival when mode=arrival. */
  anchorAt?: Date | null;
  departureAt?: Date | null;
  arrivalAt?: Date | null;
  now?: Date;
  /** Override sampling caps (tests). */
  sampling?: Partial<typeof ROUTE_WEATHER_SAMPLING>;
};

/**
 * Construct ordered route-weather samples with travel-based ETAs.
 * Reusable by recommend and future Find My Best Time (`analyzeRideAt`).
 */
export async function buildRouteWeatherTimeline(
  input: BuildRouteWeatherTimelineInput,
): Promise<RouteWeatherTimeline> {
  const durationMin = Math.max(1, Math.round(input.analysis.durationMin));
  const schedule = resolvePlanSchedule({
    planningMode: input.planningMode,
    departureAt:
      input.departureAt ??
      (input.planningMode === 'departure' ? input.anchorAt : null),
    arrivalAt:
      input.arrivalAt ??
      (input.planningMode === 'arrival' ? input.anchorAt : null),
    durationMin,
    now: input.now,
  });

  const reasonCodes: string[] = ['ROUTE_WEATHER_TIMELINE_USED'];
  let timingFallbackUsed = false;

  const path = buildCumulativePath(input.analysis);
  const anchors = selectSampleAnchors(input.analysis, input.sampling);
  const totalM = Math.max(
    input.analysis.distanceM,
    path[path.length - 1]?.distanceFromStartM ?? 0,
    0,
  );

  if (path.length === 0 || anchors.length === 0) {
    // Absolute fallback: single even sample at departure location/time.
    timingFallbackUsed = true;
    reasonCodes.push('ROUTE_TIMING_FALLBACK_USED');
    const start =
      input.analysis.geometry.points?.[0] ??
      input.analysis.travelSegments[0]?.start ?? { lat: 0, lon: 0 };
    const end =
      input.analysis.geometry.points?.[
        (input.analysis.geometry.points?.length ?? 1) - 1
      ] ??
      input.analysis.travelSegments[input.analysis.travelSegments.length - 1]
        ?.end ??
      start;

    const requests = [
      { lat: start.lat, lon: start.lon, at: schedule.departureAt },
      {
        lat: end.lat,
        lon: end.lon,
        at: schedule.arrivalAt,
      },
    ];
    const obs = await input.weatherPort.forecast(requests);
    const samples = requests.map((req, i) =>
      observationToSample({
        index: i,
        coordinate: { lat: req.lat, lon: req.lon },
        distanceFromStartM: i === 0 ? 0 : totalM,
        progress: i === 0 ? 0 : 1,
        offsetMin: i === 0 ? 0 : durationMin,
        expectedAt: req.at.toISOString(),
        observation: obs[i] ?? null,
        timingSource: 'fallback_even',
        headingDeg: null,
      }),
    );
    const partial = samples.some((s) => s.weatherMissing);
    if (partial) reasonCodes.push('ROUTE_WEATHER_PARTIAL');
    if (samples.some((s) => s.timeInterpolated)) {
      reasonCodes.push('WEATHER_TIME_INTERPOLATED');
    }
    if (samples.every((s) => s.windFromDeg == null)) {
      reasonCodes.push('WIND_DIRECTION_UNAVAILABLE');
    }

    return {
      version: ROUTE_WEATHER_TIMELINE_VERSION,
      planningMode: schedule.planningMode,
      departureAt: schedule.departureAt.toISOString(),
      arrivalAt: schedule.arrivalAt.toISOString(),
      durationMin,
      distanceM: totalM,
      samples,
      meta: {
        provider: firstProvider(obs) ?? 'unknown',
        strategy: ROUTE_WEATHER_SAMPLE_STRATEGY,
        sampleCount: samples.length,
        maxSamples: input.sampling?.maxSamples ?? ROUTE_WEATHER_SAMPLING.maxSamples,
        partial,
        timingFallbackUsed,
        reasonCodes: unique(reasonCodes),
        builtAt: new Date().toISOString(),
      },
    };
  }

  const resolved = anchors.map((anchor, index) => {
    const interp = interpolateAtDistance(path, anchor.distanceFromStartM);
    let timingSource: RouteWeatherTimingSource = 'travel_segment';
    let offsetMin: number;
    let coordinate = anchor.coordinate;
    let headingDeg: number | null = null;

    if (interp) {
      offsetMin = interp.offsetMin;
      coordinate = interp.coordinate;
      headingDeg = interp.headingDeg;
      timingSource =
        interp.timingSource === 'travel_segment'
          ? 'travel_segment'
          : 'linear_distance';
    } else {
      // Linear distance fallback when path interpolation fails.
      timingFallbackUsed = true;
      const frac = totalM > 0 ? anchor.distanceFromStartM / totalM : 0;
      offsetMin = durationMin * frac;
      timingSource = 'linear_distance';
    }

    // Clamp offset into [0, durationMin].
    offsetMin = Math.min(durationMin, Math.max(0, offsetMin));
    const expectedAt = new Date(
      schedule.departureAt.getTime() + offsetMin * 60_000,
    );

    return {
      index,
      coordinate,
      distanceFromStartM: anchor.distanceFromStartM,
      progress: totalM > 0 ? anchor.distanceFromStartM / totalM : 0,
      offsetMin: Math.round(offsetMin * 10) / 10,
      expectedAt,
      headingDeg,
      timingSource,
    };
  });

  if (timingFallbackUsed) {
    reasonCodes.push('ROUTE_TIMING_FALLBACK_USED');
  }
  if (input.analysis.meta.fallback) {
    reasonCodes.push('ROUTE_TIMING_FALLBACK_USED');
    timingFallbackUsed = true;
  }

  const forecasts = await input.weatherPort.forecast(
    resolved.map((r) => ({
      lat: r.coordinate.lat,
      lon: r.coordinate.lon,
      at: r.expectedAt,
    })),
  );

  const samples: RouteWeatherSample[] = resolved.map((r, i) =>
    observationToSample({
      index: r.index,
      coordinate: r.coordinate,
      distanceFromStartM: r.distanceFromStartM,
      progress: r.progress,
      offsetMin: r.offsetMin,
      expectedAt: r.expectedAt.toISOString(),
      observation: forecasts[i] ?? null,
      timingSource: r.timingSource,
      headingDeg: r.headingDeg,
    }),
  );

  const partial = samples.some((s) => s.weatherMissing);
  if (partial) reasonCodes.push('ROUTE_WEATHER_PARTIAL');
  if (samples.some((s) => s.timeInterpolated)) {
    reasonCodes.push('WEATHER_TIME_INTERPOLATED');
  }
  if (samples.some((s) => !s.weatherMissing && s.windFromDeg == null)) {
    reasonCodes.push('WIND_DIRECTION_UNAVAILABLE');
  }

  return {
    version: ROUTE_WEATHER_TIMELINE_VERSION,
    planningMode: schedule.planningMode,
    departureAt: schedule.departureAt.toISOString(),
    arrivalAt: schedule.arrivalAt.toISOString(),
    durationMin,
    distanceM: totalM,
    samples,
    meta: {
      provider: firstProvider(forecasts) ?? 'unknown',
      strategy: ROUTE_WEATHER_SAMPLE_STRATEGY,
      sampleCount: samples.length,
      maxSamples: input.sampling?.maxSamples ?? ROUTE_WEATHER_SAMPLING.maxSamples,
      partial,
      timingFallbackUsed,
      reasonCodes: unique(reasonCodes),
      builtAt: new Date().toISOString(),
    },
  };
}

function observationToSample(input: {
  index: number;
  coordinate: { lat: number; lon: number };
  distanceFromStartM: number;
  progress: number;
  offsetMin: number;
  expectedAt: string;
  observation: WeatherObservation | null;
  timingSource: RouteWeatherTimingSource;
  headingDeg: number | null;
}): RouteWeatherSample {
  const o = input.observation;
  if (!o) {
    return {
      index: input.index,
      coordinate: input.coordinate,
      distanceFromStartM: input.distanceFromStartM,
      progress: input.progress,
      expectedAt: input.expectedAt,
      offsetMin: input.offsetMin,
      airTempC: null,
      windSpeedMs: null,
      windFromDeg: null,
      weatherMissing: true,
      timingSource: input.timingSource,
      headingDeg: input.headingDeg,
    };
  }

  return {
    index: input.index,
    coordinate: input.coordinate,
    distanceFromStartM: input.distanceFromStartM,
    progress: input.progress,
    expectedAt: input.expectedAt,
    offsetMin: input.offsetMin,
    airTempC: o.airTempC,
    windSpeedMs: o.windSpeedMs,
    windFromDeg: o.windFromDeg ?? null,
    gustMs: o.gustMs ?? null,
    precipitationProbability: o.precipitationProbability ?? null,
    precipitationMm: o.precipitationMm ?? null,
    conditionCode: o.conditionCode ?? null,
    weatherMissing: false,
    timingSource: input.timingSource,
    timeInterpolated: o.timeInterpolated === true,
    source: o.source,
    headingDeg: input.headingDeg,
  };
}

function firstProvider(
  obs: Array<WeatherObservation | null>,
): string | undefined {
  for (const o of obs) {
    if (o?.source) return o.source;
  }
  return undefined;
}

function unique(codes: string[]): string[] {
  return [...new Set(codes)];
}
