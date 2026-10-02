/**
 * Provider-neutral weather sample positions along a route line.
 *
 * Callers pass geometry they already have (road polyline or saved waypoints).
 * This module does not call a routing provider and does not persist geometry.
 *
 * ETA follows provider leg timing when that breakdown was actually returned.
 * Otherwise ETA follows distance along the line. Saved-waypoint fallback never
 * receives invented per-leg times.
 */

import type { GeoPoint, RouteLegTiming } from './routing.types';

/** Upper bound so a dense road line does not become a dense weather fetch. */
export const MAX_ROUTE_WEATHER_SAMPLES = 5;

/**
 * Road lines shorter than this are sampled at the endpoints only.
 * Saved-waypoint fallback is already sparse and does not use this cutoff.
 */
export const SHORT_ROUTE_DISTANCE_M = 8_000;

/** Target spacing when choosing how many points to take from a road line. */
const TARGET_SAMPLE_SPACING_M = 25_000;

export type RouteWeatherSample = {
  lat: number;
  lon: number;
  /** Estimated arrival at this position. */
  at: Date;
  /** Distance fraction along the supplied line. 0 at the start, 1 at the end. */
  progress: number;
  /**
   * Duration fraction used for `at`.
   * Equals `progress` when no provider leg timing applies.
   */
  timeProgress: number;
};

export function sampleWeatherAlongGeometry(input: {
  points: GeoPoint[];
  durationMin: number;
  departAt: Date;
  maxSamples?: number;
  /**
   * Road lines are interpolated along the polyline.
   * Saved waypoints stay on the given vertices so fallback does not invent coordinates.
   */
  verticesOnly?: boolean;
  /**
   * Provider leg timing along the road line.
   * Ignored for saved-waypoint fallback (`verticesOnly`), and ignored when the
   * legs do not describe this duration.
   */
  legs?: RouteLegTiming[] | null;
}): RouteWeatherSample[] {
  const points = input.points.filter(isGeoPoint);
  if (points.length === 0) return [];

  const maxSamples = Math.max(2, input.maxSamples ?? MAX_ROUTE_WEATHER_SAMPLES);
  const durationMin = Number.isFinite(input.durationMin)
    ? Math.max(0, input.durationMin)
    : 0;
  const cumulative = cumulativeDistanceM(points);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const legs = input.verticesOnly
    ? null
    : reconcileProviderLegs(input.legs, durationMin);

  if (points.length === 1) {
    return [
      placedSample(points[0], 0, input.departAt, durationMin, legs),
    ];
  }

  if (input.verticesOnly) {
    const indices = vertexIndices(cumulative, maxSamples);
    return indices.map((index) => {
      const progress =
        total > 0 ? cumulative[index] / total : index / (points.length - 1);
      return placedSample(
        points[index],
        progress,
        input.departAt,
        durationMin,
        null,
      );
    });
  }

  const count = roadSampleCount(total, maxSamples);
  const samples: RouteWeatherSample[] = [];
  for (let i = 0; i < count; i++) {
    const progress = count === 1 ? 0 : i / (count - 1);
    const point =
      i === 0
        ? points[0]
        : i === count - 1
          ? points[points.length - 1]
          : pointAtDistance(points, cumulative, total * progress);
    samples.push(
      placedSample(point, progress, input.departAt, durationMin, legs),
    );
  }
  return samples;
}

/**
 * Prefer a real road line and its provider duration.
 * Otherwise sample the saved waypoints with the duration hint.
 */
export function resolveRouteWeatherSamples(input: {
  roadGeometry?: GeoPoint[] | null;
  providerDurationMin?: number | null;
  /**
   * Used only with a real road line. Fallback waypoints keep distance-based
   * ETAs so a missing provider breakdown is not turned into leg times.
   */
  providerLegs?: RouteLegTiming[] | null;
  fallbackPoints: GeoPoint[];
  fallbackDurationMin: number;
  departAt: Date;
}): {
  samples: RouteWeatherSample[];
  durationMin: number;
  usedRoadGeometry: boolean;
  /** Reconciled legs that produced the sample ETAs, or null when unused. */
  appliedLegs: RouteLegTiming[] | null;
} {
  const road = (input.roadGeometry ?? []).filter(isGeoPoint);
  const providerDuration = input.providerDurationMin;
  if (
    road.length >= 2 &&
    providerDuration != null &&
    Number.isFinite(providerDuration) &&
    providerDuration > 0
  ) {
    const appliedLegs = reconcileProviderLegs(
      input.providerLegs,
      providerDuration,
    );
    return {
      samples: sampleWeatherAlongGeometry({
        points: road,
        durationMin: providerDuration,
        departAt: input.departAt,
        legs: appliedLegs,
      }),
      durationMin: providerDuration,
      usedRoadGeometry: true,
      appliedLegs,
    };
  }

  const fallback = input.fallbackPoints.filter(isGeoPoint);
  const durationMin = Math.max(
    1,
    Math.round(
      Number.isFinite(input.fallbackDurationMin)
        ? input.fallbackDurationMin
        : 1,
    ),
  );
  return {
    samples: sampleWeatherAlongGeometry({
      points: fallback,
      durationMin,
      departAt: input.departAt,
      verticesOnly: true,
    }),
    durationMin,
    usedRoadGeometry: false,
    appliedLegs: null,
  };
}

/**
 * Keep provider leg timing only when it already describes this route duration.
 * A one-minute gap is rounding. A larger gap is not rewritten into a new timeline.
 * Time with no distance is rejected: that wait has no position on the line.
 */
export function reconcileProviderLegs(
  legs: RouteLegTiming[] | null | undefined,
  durationMin: number,
): RouteLegTiming[] | null {
  if (!legs || legs.length === 0) return null;
  if (!Number.isFinite(durationMin) || durationMin <= 0) return null;

  const cleaned: RouteLegTiming[] = [];
  for (const leg of legs) {
    if (!Number.isFinite(leg.distanceM) || !Number.isFinite(leg.durationMin)) {
      return null;
    }
    if (leg.distanceM < 0 || leg.durationMin < 0) return null;
    if (leg.distanceM === 0 && leg.durationMin > 0) return null;
    cleaned.push({
      distanceM: leg.distanceM,
      durationMin: leg.durationMin,
    });
  }

  const distance = cleaned.reduce((sum, leg) => sum + leg.distanceM, 0);
  const duration = cleaned.reduce((sum, leg) => sum + leg.durationMin, 0);
  if (!(distance > 0) || !(duration > 0)) return null;

  const delta = durationMin - duration;
  if (Math.abs(delta) > 1) return null;

  const adjusted = cleaned.map((leg) => ({ ...leg }));
  const last = adjusted.length - 1;
  const lastDuration = adjusted[last].durationMin + delta;
  if (lastDuration < 0) return null;
  adjusted[last] = { ...adjusted[last], durationMin: lastDuration };
  return adjusted;
}

/** Duration fraction at a distance fraction along reconciled provider legs. */
export function timeProgressAlongLegs(
  distanceProgress: number,
  legs: RouteLegTiming[],
): number {
  const totalDistance = legs.reduce((sum, leg) => sum + leg.distanceM, 0);
  const totalDuration = legs.reduce((sum, leg) => sum + leg.durationMin, 0);
  if (!(totalDistance > 0) || !(totalDuration > 0)) {
    return Math.min(1, Math.max(0, distanceProgress));
  }

  const clamped = Math.min(1, Math.max(0, distanceProgress));
  const target = clamped * totalDistance;
  let traversed = 0;
  let elapsed = 0;
  for (let index = 0; index < legs.length; index++) {
    const leg = legs[index];
    const next = traversed + leg.distanceM;
    const isLast = index === legs.length - 1;
    if (target <= next || isLast) {
      const into = leg.distanceM > 0 ? (target - traversed) / leg.distanceM : 1;
      const bounded = Math.min(1, Math.max(0, into));
      return (elapsed + leg.durationMin * bounded) / totalDuration;
    }
    traversed = next;
    elapsed += leg.durationMin;
  }
  return 1;
}

function placedSample(
  point: GeoPoint,
  distanceProgress: number,
  departAt: Date,
  durationMin: number,
  legs: RouteLegTiming[] | null,
): RouteWeatherSample {
  const progress = distanceProgress;
  const timeProgress = legs
    ? timeProgressAlongLegs(progress, legs)
    : progress;
  return {
    lat: point.lat,
    lon: point.lon,
    at: arrivalAt(departAt, durationMin, timeProgress),
    progress,
    timeProgress,
  };
}

function roadSampleCount(distanceM: number, maxSamples: number): number {
  if (distanceM < SHORT_ROUTE_DISTANCE_M) return 2;
  const spaced = Math.round(distanceM / TARGET_SAMPLE_SPACING_M) + 1;
  return Math.min(maxSamples, Math.max(2, spaced));
}

function vertexIndices(cumulative: number[], maxSamples: number): number[] {
  const last = cumulative.length - 1;
  if (last <= 0) return [0];
  if (cumulative.length <= maxSamples) {
    return cumulative.map((_, index) => index);
  }
  return spreadIndices(cumulative, maxSamples);
}

function spreadIndices(cumulative: number[], count: number): number[] {
  const last = cumulative.length - 1;
  const total = cumulative[last];
  const chosen = [0];
  for (let sample = 1; sample < count - 1; sample++) {
    const target = total * (sample / (count - 1));
    let best = 1;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let index = 1; index < last; index++) {
      if (chosen.includes(index)) continue;
      const delta = Math.abs(cumulative[index] - target);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = index;
      }
    }
    chosen.push(best);
  }
  chosen.push(last);
  chosen.sort((a, b) => a - b);
  return chosen;
}

function pointAtDistance(
  points: GeoPoint[],
  cumulative: number[],
  distanceM: number,
): GeoPoint {
  const total = cumulative[cumulative.length - 1] ?? 0;
  if (distanceM <= 0 || total <= 0) return points[0];
  if (distanceM >= total) return points[points.length - 1];
  let index = 1;
  while (index < cumulative.length && cumulative[index] < distanceM) index++;
  const start = cumulative[index - 1];
  const end = cumulative[index];
  const span = end - start;
  const t = span > 0 ? (distanceM - start) / span : 0;
  return {
    lat:
      points[index - 1].lat + (points[index].lat - points[index - 1].lat) * t,
    lon:
      points[index - 1].lon + (points[index].lon - points[index - 1].lon) * t,
  };
}

function cumulativeDistanceM(points: GeoPoint[]): number[] {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineM(points[i - 1], points[i]));
  }
  return cumulative;
}

function arrivalAt(
  departAt: Date,
  durationMin: number,
  progress: number,
): Date {
  const clamped = Math.min(1, Math.max(0, progress));
  return new Date(
    departAt.getTime() + Math.round(durationMin * 60_000 * clamped),
  );
}

function isGeoPoint(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lon >= -180 &&
    point.lon <= 180
  );
}

function haversineM(a: GeoPoint, b: GeoPoint): number {
  const earthM = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthM * Math.asin(Math.min(1, Math.sqrt(h)));
}
