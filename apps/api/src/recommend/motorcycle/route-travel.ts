/**
 * Provider-neutral route travel / speed profile for motorcycle exposure.
 *
 * Routing providers (Google Routes, etc.) must adapt into this shape —
 * the M3 engine never imports provider SDKs or response DTOs.
 *
 * expectedSpeedKmh is travel-realistic speed (often from duration/distance),
 * NOT necessarily the legal speed limit. speedLimitKmh is diagnostic only.
 *
 * Adapter boundary: implement `RouteTravelAdapter<T>` outside this module
 * (e.g. Google Routes steps → RouteTravelSegment[]). Prefer ETA-derived
 * expectedSpeedKmh over legal limits for airflow exposure.
 */

import {
  reconcileProviderLegs,
  timeProgressAlongLegs,
} from '../../routing/route-weather-sampling';
import type { RouteLegTiming } from '../../routing/routing.types';

export type SpeedSource =
  | 'route_profile'
  | 'explicit_cruise'
  | 'assumed_default';

export type RouteTravelSegment = {
  index: number;
  durationMin: number;
  expectedSpeedKmh: number;
  distanceM?: number;
  /** Legal limit when known — not used as airflow speed. */
  speedLimitKmh?: number | null;
  roadClass?: string | null;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  /** Travel heading (degrees clockwise from north), when known. */
  headingDeg?: number | null;
};

/** Transform a provider-specific routing response into RideWear travel segments. */
export type RouteTravelAdapter<TProviderResponse> = {
  toTravelSegments(response: TProviderResponse): RouteTravelSegment[];
};

/**
 * Build a single travel segment from total duration + distance.
 * Useful when a provider returns only overview ETA/distance.
 */
export function routeTravelFromDurationDistance(input: {
  durationMin: number;
  distanceM: number;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
}): RouteTravelSegment[] {
  const durationMin = Math.max(1, input.durationMin);
  const distanceM = Math.max(0, input.distanceM);
  const hours = durationMin / 60;
  const expectedSpeedKmh =
    hours > 0 && distanceM > 0 ? distanceM / 1000 / hours : 0;
  return [
    {
      index: 0,
      durationMin,
      distanceM,
      expectedSpeedKmh: Math.round(expectedSpeedKmh * 10) / 10,
      startLat: input.startLat,
      startLon: input.startLon,
      endLat: input.endLat,
      endLon: input.endLon,
    },
  ];
}

export function durationWeightedSpeedKmh(
  segments: Array<{ durationMin: number; expectedSpeedKmh: number }>,
): number {
  const total = segments.reduce((s, x) => s + x.durationMin, 0);
  if (total <= 0) return 0;
  return (
    segments.reduce((s, x) => s + x.expectedSpeedKmh * x.durationMin, 0) /
    total
  );
}

/**
 * Duration shares for weather samples already placed along a route.
 * One segment per sample so associateWeatherIndex stays 1:1.
 * Without provider legs, speed is the route overview (distance / duration).
 * With provider legs, speed is that sample's distance band divided by the
 * provider time in the band. Neither path uses a legal speed limit.
 */
export function routeTravelAlignedWithSamples(input: {
  samples: Array<{ lat: number; lon: number; progress: number }>;
  durationMin: number;
  distanceM: number;
  /**
   * When these legs reconcile to `durationMin`, each sample owns the provider
   * time in its distance band. Without them, one overview speed is used.
   */
  legs?: RouteLegTiming[] | null;
}): RouteTravelSegment[] {
  const samples = input.samples.filter(
    (sample) =>
      Number.isFinite(sample.lat) &&
      Number.isFinite(sample.lon) &&
      Number.isFinite(sample.progress),
  );
  if (samples.length === 0) return [];

  const durationMin = Math.max(1, Math.round(input.durationMin));
  const distanceM = Math.max(0, input.distanceM);
  const progresses = samples.map((sample) =>
    Math.min(1, Math.max(0, sample.progress)),
  );
  const reconciled = reconcileProviderLegs(input.legs, durationMin);
  const timeAt = reconciled
    ? (fraction: number) => timeProgressAlongLegs(fraction, reconciled)
    : (fraction: number) => fraction;
  const durations = durationShares(progresses, durationMin, timeAt);
  const durationSum = durations.reduce((sum, value) => sum + value, 0);
  const bounds = distanceBounds(progresses);
  const hours = durationMin / 60;
  const overviewSpeedKmh =
    hours > 0 && distanceM > 0
      ? Math.round((distanceM / 1000 / hours) * 10) / 10
      : 0;

  return samples.map((sample, index) => {
    const next = samples[Math.min(index + 1, samples.length - 1)];
    const previous = samples[Math.max(0, index - 1)];
    const heading =
      index < samples.length - 1
        ? headingDeg(sample, next)
        : headingDeg(previous, sample);
    const share = durationSum > 0 ? durations[index] / durationSum : 0;
    const band = Math.max(0, bounds[index + 1] - bounds[index]);
    const segmentDistanceM = reconciled
      ? Math.max(0, Math.round(distanceM * band))
      : Math.max(0, Math.round(distanceM * share));
    const expectedSpeedKmh = reconciled
      ? speedKmh(segmentDistanceM, durations[index])
      : overviewSpeedKmh;
    return {
      index,
      durationMin: durations[index],
      distanceM: segmentDistanceM,
      expectedSpeedKmh,
      startLat: sample.lat,
      startLon: sample.lon,
      endLat: next.lat,
      endLon: next.lon,
      headingDeg: heading,
    };
  });
}

function distanceBounds(progresses: number[]): number[] {
  if (progresses.length <= 1) return [0, 1];
  const bounds = [0];
  for (let index = 0; index < progresses.length - 1; index++) {
    bounds.push((progresses[index] + progresses[index + 1]) / 2);
  }
  bounds.push(1);
  return bounds;
}

function durationShares(
  progresses: number[],
  durationMin: number,
  timeAt: (distanceFraction: number) => number,
): number[] {
  const count = progresses.length;
  if (count === 1) return [durationMin];

  const bounds = distanceBounds(progresses);
  const widths = bounds
    .slice(0, count)
    .map((bound, index) => Math.max(0, timeAt(bounds[index + 1]) - timeAt(bound)));
  const widthSum = widths.reduce((sum, width) => sum + width, 0) || 1;
  const durations = widths.map((width) =>
    Math.max(1, Math.round((width / widthSum) * durationMin)),
  );
  const sum = durations.reduce((total, value) => total + value, 0);
  durations[count - 1] = Math.max(
    1,
    durations[count - 1] + (durationMin - sum),
  );
  return durations;
}

function speedKmh(distanceM: number, durationMin: number): number {
  const hours = durationMin / 60;
  if (hours <= 0 || distanceM <= 0) return 0;
  return Math.round((distanceM / 1000 / hours) * 10) / 10;
}

function headingDeg(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number | null {
  if (a.lat === b.lat && a.lon === b.lon) return null;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const toDeg = (radians: number) => (radians * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Deterministic weather↔travel association (v1).
 *
 * Travel segments drive duration/speed. Each travel segment is paired with a
 * weather sample by cumulative duration fraction along the weather timeline.
 * When sample count equals segment count (geometry sampling), the map is 1:1.
 */
export function associateWeatherIndex(
  travelIndex: number,
  travelCount: number,
  weatherCount: number,
): number {
  if (weatherCount <= 0) return 0;
  if (travelCount <= 1) return 0;
  const frac = travelIndex / (travelCount - 1);
  return Math.min(
    weatherCount - 1,
    Math.max(0, Math.round(frac * (weatherCount - 1))),
  );
}
