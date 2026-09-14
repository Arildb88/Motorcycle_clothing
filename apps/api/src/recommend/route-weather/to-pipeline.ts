/**
 * Map RouteWeatherTimeline → motorcycle pipeline weather + travel segments.
 *
 * Timeline samples become WeatherPoints. Adjacent samples become
 * RouteTravelSegment rows whose durationMin is the ETA delta (travel-based).
 * Exposure / demand stay in the motorcycle engine — this layer only prepares data.
 */

import type { RouteTravelSegment } from '../motorcycle/route-travel';
import type { RouteWeatherSummary, WeatherPoint } from '../weather.types';
import type { RouteWeatherSample, RouteWeatherTimeline } from './types';

export type TimelinePipelineInput = {
  weather: RouteWeatherSummary;
  routeTravelSegments: RouteTravelSegment[];
  rideDurationMin: number;
};

/**
 * Convert a timeline into pipeline weather + duration-weighted travel segments.
 *
 * n samples → n−1 travel legs (weather of the departing sample for each leg).
 * Single sample → one leg spanning full duration.
 */
export function timelineToPipelineInput(
  timeline: RouteWeatherTimeline,
): TimelinePipelineInput {
  const samples = timeline.samples;
  const points: WeatherPoint[] = samples.map((s) =>
    sampleToWeatherPoint(s, timeline),
  );

  const temps = points.map((p) => p.airTempC);
  const rains = points.map((p) => p.precipitationProbPct);
  const precips = points.map((p) => p.precipitationMm);
  const winds = points.map((p) => p.windSpeedMs);

  const weather: RouteWeatherSummary = {
    provider: timeline.meta.provider,
    sampledAt: timeline.meta.builtAt,
    points,
    minTempC: temps.length ? Math.min(...temps) : 0,
    maxTempC: temps.length ? Math.max(...temps) : 0,
    maxRainProbPct: rains.length ? Math.max(...rains) : 0,
    maxPrecipMm: precips.length ? Math.max(...precips) : 0,
    maxWindMs: winds.length ? Math.max(...winds) : 0,
  };

  const routeTravelSegments: RouteTravelSegment[] = [];

  if (samples.length === 0) {
    return {
      weather,
      routeTravelSegments: [],
      rideDurationMin: timeline.durationMin,
    };
  }

  if (samples.length === 1) {
    const s = samples[0];
    routeTravelSegments.push({
      index: 0,
      durationMin: Math.max(1, Math.round(timeline.durationMin)),
      expectedSpeedKmh: speedBetween(
        s.distanceFromStartM,
        timeline.distanceM,
        0,
        timeline.durationMin,
      ),
      distanceM: Math.max(0, Math.round(timeline.distanceM)),
      startLat: s.coordinate.lat,
      startLon: s.coordinate.lon,
      endLat: s.coordinate.lat,
      endLon: s.coordinate.lon,
      headingDeg: s.headingDeg ?? null,
    });
  } else {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      const durationMin = Math.max(1, Math.round(b.offsetMin - a.offsetMin));
      const distanceM = Math.max(
        0,
        Math.round(b.distanceFromStartM - a.distanceFromStartM),
      );
      routeTravelSegments.push({
        index: i,
        durationMin,
        expectedSpeedKmh: speedBetween(
          a.distanceFromStartM,
          b.distanceFromStartM,
          a.offsetMin,
          b.offsetMin,
        ),
        distanceM,
        startLat: a.coordinate.lat,
        startLon: a.coordinate.lon,
        endLat: b.coordinate.lat,
        endLon: b.coordinate.lon,
        headingDeg: a.headingDeg ?? null,
      });
    }
  }

  // Re-normalize duration sum to timeline.durationMin.
  const sum = routeTravelSegments.reduce((s, t) => s + t.durationMin, 0);
  if (
    routeTravelSegments.length > 0 &&
    sum !== timeline.durationMin &&
    timeline.durationMin > 0
  ) {
    const last = routeTravelSegments[routeTravelSegments.length - 1];
    last.durationMin = Math.max(
      1,
      last.durationMin + (timeline.durationMin - sum),
    );
  }

  return {
    weather,
    routeTravelSegments,
    rideDurationMin: timeline.durationMin,
  };
}

function sampleToWeatherPoint(
  s: RouteWeatherSample,
  timeline: RouteWeatherTimeline,
): WeatherPoint {
  const airTempC =
    s.airTempC != null && Number.isFinite(s.airTempC)
      ? s.airTempC
      : fallbackTemp(timeline);
  const windSpeedMs =
    s.windSpeedMs != null && Number.isFinite(s.windSpeedMs) ? s.windSpeedMs : 0;
  const precipitationProbPct =
    s.precipitationProbability != null &&
    Number.isFinite(s.precipitationProbability)
      ? s.precipitationProbability
      : 0;
  const precipitationMm =
    s.precipitationMm != null && Number.isFinite(s.precipitationMm)
      ? s.precipitationMm
      : 0;

  const point: WeatherPoint = {
    lat: s.coordinate.lat,
    lon: s.coordinate.lon,
    airTempC,
    precipitationProbPct,
    precipitationMm,
    windSpeedMs,
    symbol: s.conditionCode ?? undefined,
  };

  if (s.windFromDeg != null && Number.isFinite(s.windFromDeg)) {
    point.windFromDeg = s.windFromDeg;
  }
  // Intentionally omit windFromDeg when unknown — never invent.

  return point;
}

function fallbackTemp(timeline: RouteWeatherTimeline): number {
  const known = timeline.samples
    .map((s) => s.airTempC)
    .filter((t): t is number => t != null && Number.isFinite(t));
  if (known.length === 0) return 10;
  return known.reduce((a, b) => a + b, 0) / known.length;
}

function speedBetween(
  distA: number,
  distB: number,
  timeA: number,
  timeB: number,
): number {
  const dm = Math.max(0, distB - distA);
  const minutes = Math.max(1e-6, timeB - timeA);
  const hours = minutes / 60;
  return Math.round((dm / 1000 / hours) * 10) / 10;
}
