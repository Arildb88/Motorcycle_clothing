/**
 * Provider-neutral weather sample positions along a route line.
 *
 * Callers pass geometry they already have (road polyline or saved waypoints).
 * This module does not call a routing provider and does not persist geometry.
 */

import type { GeoPoint } from './routing.types';

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
}): RouteWeatherSample[] {
  const points = input.points.filter(isGeoPoint);
  if (points.length === 0) return [];

  const maxSamples = Math.max(2, input.maxSamples ?? MAX_ROUTE_WEATHER_SAMPLES);
  const durationMin = Number.isFinite(input.durationMin)
    ? Math.max(0, input.durationMin)
    : 0;
  const cumulative = cumulativeDistanceM(points);
  const total = cumulative[cumulative.length - 1] ?? 0;

  if (points.length === 1) {
    return [
      {
        lat: points[0].lat,
        lon: points[0].lon,
        at: arrivalAt(input.departAt, durationMin, 0),
        progress: 0,
      },
    ];
  }

  if (input.verticesOnly) {
    const indices = vertexIndices(cumulative, maxSamples);
    return indices.map((index) => {
      const progress =
        total > 0 ? cumulative[index] / total : index / (points.length - 1);
      return {
        lat: points[index].lat,
        lon: points[index].lon,
        at: arrivalAt(input.departAt, durationMin, progress),
        progress,
      };
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
    samples.push({
      lat: point.lat,
      lon: point.lon,
      at: arrivalAt(input.departAt, durationMin, progress),
      progress,
    });
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
  fallbackPoints: GeoPoint[];
  fallbackDurationMin: number;
  departAt: Date;
}): {
  samples: RouteWeatherSample[];
  durationMin: number;
  usedRoadGeometry: boolean;
} {
  const road = (input.roadGeometry ?? []).filter(isGeoPoint);
  const providerDuration = input.providerDurationMin;
  if (
    road.length >= 2 &&
    providerDuration != null &&
    Number.isFinite(providerDuration) &&
    providerDuration > 0
  ) {
    return {
      samples: sampleWeatherAlongGeometry({
        points: road,
        durationMin: providerDuration,
        departAt: input.departAt,
      }),
      durationMin: providerDuration,
      usedRoadGeometry: true,
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
