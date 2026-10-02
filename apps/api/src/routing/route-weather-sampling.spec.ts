import {
  associateWeatherIndex,
  routeTravelAlignedWithSamples,
} from '../recommend/motorcycle/route-travel';
import {
  MAX_ROUTE_WEATHER_SAMPLES,
  resolveRouteWeatherSamples,
  sampleWeatherAlongGeometry,
} from './route-weather-sampling';
import type { GeoPoint } from './routing.types';

const departAt = new Date('2026-10-01T08:00:00.000Z');

/**
 * Bent road: east, then north. A chord from start to end would cut the corner.
 * Distances are large enough to request interior samples.
 */
const bentRoad: GeoPoint[] = [
  { lat: 59, lon: 10 },
  { lat: 59, lon: 10.5 },
  { lat: 59.5, lon: 10.5 },
];

describe('sampleWeatherAlongGeometry', () => {
  it('places interior samples on the road line, including the endpoints', () => {
    const samples = sampleWeatherAlongGeometry({
      points: bentRoad,
      durationMin: 80,
      departAt,
    });

    expect(samples.length).toBeGreaterThan(2);
    expect(samples.length).toBeLessThanOrEqual(MAX_ROUTE_WEATHER_SAMPLES);
    expect(samples[0]).toMatchObject({ lat: 59, lon: 10, progress: 0 });
    expect(samples[0].at.toISOString()).toBe('2026-10-01T08:00:00.000Z');
    const last = samples[samples.length - 1];
    expect(last).toMatchObject({ lat: 59.5, lon: 10.5, progress: 1 });
    expect(last.at.toISOString()).toBe('2026-10-01T09:20:00.000Z');

    const interior = samples.slice(1, -1);
    expect(interior.length).toBeGreaterThan(0);
    for (const sample of interior) {
      const onEastLeg = Math.abs(sample.lat - 59) < 0.02 && sample.lon < 10.5;
      const onNorthLeg = Math.abs(sample.lon - 10.5) < 0.02 && sample.lat > 59;
      expect(onEastLeg || onNorthLeg).toBe(true);
    }
  });

  it('advances ETA with route progress', () => {
    const samples = sampleWeatherAlongGeometry({
      points: bentRoad,
      durationMin: 80,
      departAt,
    });

    for (let index = 1; index < samples.length; index++) {
      expect(samples[index].progress).toBeGreaterThan(
        samples[index - 1].progress,
      );
      expect(samples[index].at.getTime()).toBeGreaterThan(
        samples[index - 1].at.getTime(),
      );
    }
    const mid = samples[Math.floor(samples.length / 2)];
    expect(mid.at.getTime()).toBe(
      departAt.getTime() + Math.round(80 * 60_000 * mid.progress),
    );
  });

  it('keeps short routes to the endpoints', () => {
    const points: GeoPoint[] = [];
    for (let step = 0; step < 12; step++) {
      points.push({ lat: 59 + step * 0.002, lon: 10 });
    }
    const samples = sampleWeatherAlongGeometry({
      points,
      durationMin: 12,
      departAt,
    });
    expect(samples).toHaveLength(2);
    expect(samples[0]).toMatchObject({
      lat: points[0].lat,
      lon: points[0].lon,
      progress: 0,
    });
    expect(samples[1]).toMatchObject({
      lat: points[11].lat,
      lon: points[11].lon,
      progress: 1,
    });
    expect(samples[1].at.toISOString()).toBe('2026-10-01T08:12:00.000Z');
  });

  it('caps a long dense line', () => {
    const points: GeoPoint[] = [];
    for (let step = 0; step < 40; step++) {
      points.push({ lat: 58 + step * 0.05, lon: 8 });
    }
    const samples = sampleWeatherAlongGeometry({
      points,
      durationMin: 180,
      departAt,
    });
    expect(samples).toHaveLength(MAX_ROUTE_WEATHER_SAMPLES);
    expect(samples[0].lat).toBe(points[0].lat);
    expect(samples[samples.length - 1].lat).toBe(points[39].lat);
  });
});

describe('resolveRouteWeatherSamples fallback', () => {
  const waypoints: GeoPoint[] = [
    { lat: 59, lon: 10 },
    { lat: 59.02, lon: 10 },
    { lat: 59.02, lon: 10.8 },
  ];

  it('uses saved waypoint vertices and the duration hint when the road line is missing', () => {
    const resolved = resolveRouteWeatherSamples({
      roadGeometry: null,
      providerDurationMin: null,
      fallbackPoints: waypoints,
      fallbackDurationMin: 40,
      departAt,
    });

    expect(resolved.usedRoadGeometry).toBe(false);
    expect(resolved.durationMin).toBe(40);
    expect(
      resolved.samples.map((sample) => ({ lat: sample.lat, lon: sample.lon })),
    ).toEqual(waypoints);
    expect(resolved.samples[0].at.toISOString()).toBe(
      '2026-10-01T08:00:00.000Z',
    );
    expect(resolved.samples[2].at.toISOString()).toBe(
      '2026-10-01T08:40:00.000Z',
    );
    expect(resolved.samples[1].progress).toBeLessThan(0.35);
    expect(resolved.samples[1].at.getTime()).toBeLessThan(
      departAt.getTime() + 14 * 60_000,
    );
  });

  it('falls back when provider geometry or duration is incomplete', () => {
    const missingLine = resolveRouteWeatherSamples({
      roadGeometry: [waypoints[0]],
      providerDurationMin: 22,
      fallbackPoints: waypoints.slice(0, 2),
      fallbackDurationMin: 30,
      departAt,
    });
    expect(missingLine.usedRoadGeometry).toBe(false);
    expect(missingLine.durationMin).toBe(30);
    expect(missingLine.samples).toHaveLength(2);

    const missingDuration = resolveRouteWeatherSamples({
      roadGeometry: bentRoad,
      providerDurationMin: 0,
      fallbackPoints: waypoints.slice(0, 2),
      fallbackDurationMin: 30,
      departAt,
    });
    expect(missingDuration.usedRoadGeometry).toBe(false);
    expect(missingDuration.samples.map((sample) => sample.lat)).toEqual([
      59, 59.02,
    ]);
  });

  it('prefers the road line and provider duration when both are present', () => {
    const resolved = resolveRouteWeatherSamples({
      roadGeometry: bentRoad,
      providerDurationMin: 80,
      fallbackPoints: waypoints,
      fallbackDurationMin: 30,
      departAt,
    });
    expect(resolved.usedRoadGeometry).toBe(true);
    expect(resolved.durationMin).toBe(80);
    expect(resolved.samples[0]).toMatchObject({ lat: 59, lon: 10 });
    expect(resolved.samples[resolved.samples.length - 1]).toMatchObject({
      lat: 59.5,
      lon: 10.5,
    });
    expect(resolved.samples.some((sample) => sample.lon === 10.8)).toBe(false);
  });
});

describe('routeTravelAlignedWithSamples', () => {
  it('keeps one segment per sample so weather association stays aligned', () => {
    const samples = sampleWeatherAlongGeometry({
      points: bentRoad,
      durationMin: 80,
      departAt,
    });
    const segments = routeTravelAlignedWithSamples({
      samples,
      durationMin: 80,
      distanceM: 90_000,
    });
    expect(segments).toHaveLength(samples.length);
    expect(
      segments.reduce((sum, segment) => sum + segment.durationMin, 0),
    ).toBe(80);
    expect(segments.every((segment) => segment.expectedSpeedKmh > 0)).toBe(
      true,
    );
    segments.forEach((segment, index) => {
      expect(
        associateWeatherIndex(index, segments.length, samples.length),
      ).toBe(index);
    });
  });

  it('keeps one overview speed when provider legs are absent', () => {
    const samples = sampleWeatherAlongGeometry({
      points: bentRoad,
      durationMin: 80,
      departAt,
    });
    const segments = routeTravelAlignedWithSamples({
      samples,
      durationMin: 80,
      distanceM: 90_000,
    });
    const speeds = segments.map((segment) => segment.expectedSpeedKmh);
    expect(new Set(speeds).size).toBe(1);
    expect(speeds[0]).toBeGreaterThan(0);
  });

  it('gives a slow provider leg more time and a lower speed', () => {
    const samples = [
      { lat: 0, lon: 0, progress: 0 },
      { lat: 0, lon: 0.5, progress: 0.5 },
      { lat: 0, lon: 1, progress: 1 },
    ];
    const segments = routeTravelAlignedWithSamples({
      samples,
      durationMin: 50,
      distanceM: 100_000,
      legs: [
        { distanceM: 50_000, durationMin: 40 },
        { distanceM: 50_000, durationMin: 10 },
      ],
    });

    expect(segments).toHaveLength(3);
    expect(segments.reduce((sum, segment) => sum + segment.durationMin, 0)).toBe(
      50,
    );
    expect(segments[0].durationMin).toBeGreaterThan(segments[2].durationMin);
    expect(segments[0].expectedSpeedKmh).toBeLessThan(
      segments[2].expectedSpeedKmh,
    );
    expect(segments[0].distanceM).toBeLessThan(segments[1].distanceM ?? 0);
  });
});

describe('provider leg ETA', () => {
  const line: GeoPoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ];
  const slowFirstLeg = [
    { distanceM: 1, durationMin: 80 },
    { distanceM: 3, durationMin: 20 },
  ];

  it('places ETA from provider leg timing and keeps samples on the line', () => {
    const samples = sampleWeatherAlongGeometry({
      points: line,
      durationMin: 100,
      departAt,
      legs: slowFirstLeg,
    });

    expect(samples).toHaveLength(MAX_ROUTE_WEATHER_SAMPLES);
    expect(samples[0]).toMatchObject({
      lat: 0,
      lon: 0,
      progress: 0,
      timeProgress: 0,
    });
    expect(samples[0].at.toISOString()).toBe('2026-10-01T08:00:00.000Z');

    const quarter = samples[1];
    expect(quarter.progress).toBeCloseTo(0.25, 10);
    expect(quarter.lat).toBeCloseTo(0, 8);
    expect(quarter.lon).toBeCloseTo(0.25, 6);
    expect(quarter.timeProgress).toBeCloseTo(0.8, 10);
    expect(quarter.at.getTime()).toBe(
      departAt.getTime() + Math.round(100 * 60_000 * quarter.timeProgress),
    );
    expect(quarter.at.getTime()).toBeGreaterThan(
      departAt.getTime() + 70 * 60_000,
    );

    const last = samples[samples.length - 1];
    expect(last).toMatchObject({ lat: 0, lon: 1, progress: 1 });
    expect(last.timeProgress).toBeCloseTo(1, 10);
    expect(last.at.toISOString()).toBe('2026-10-01T09:40:00.000Z');

    for (let index = 1; index < samples.length; index++) {
      expect(samples[index].progress).toBeGreaterThan(
        samples[index - 1].progress,
      );
      expect(samples[index].timeProgress).toBeGreaterThan(
        samples[index - 1].timeProgress,
      );
      expect(samples[index].at.getTime()).toBeGreaterThanOrEqual(
        samples[index - 1].at.getTime(),
      );
    }
  });

  it('keeps short routes on the endpoints when legs exist', () => {
    const points: GeoPoint[] = [];
    for (let step = 0; step < 8; step++) {
      points.push({ lat: 59 + step * 0.002, lon: 10 });
    }
    const samples = sampleWeatherAlongGeometry({
      points,
      durationMin: 12,
      departAt,
      legs: [
        { distanceM: 100, durationMin: 10 },
        { distanceM: 900, durationMin: 2 },
      ],
    });
    expect(samples).toHaveLength(2);
    expect(samples[0].timeProgress).toBe(0);
    expect(samples[1]).toMatchObject({
      lat: points[7].lat,
      lon: points[7].lon,
      progress: 1,
    });
    expect(samples[1].timeProgress).toBeCloseTo(1, 10);
    expect(samples[1].at.toISOString()).toBe('2026-10-01T08:12:00.000Z');
  });

  it('does not invent leg timing for saved waypoints or unusable legs', () => {
    const waypoints: GeoPoint[] = [
      { lat: 59, lon: 10 },
      { lat: 59.02, lon: 10 },
      { lat: 59.02, lon: 10.8 },
    ];
    const invented = [
      { distanceM: 1, durationMin: 39 },
      { distanceM: 100, durationMin: 1 },
    ];
    const fallback = resolveRouteWeatherSamples({
      roadGeometry: null,
      providerDurationMin: 40,
      providerLegs: invented,
      fallbackPoints: waypoints,
      fallbackDurationMin: 40,
      departAt,
    });
    expect(fallback.usedRoadGeometry).toBe(false);
    expect(fallback.appliedLegs).toBeNull();
    expect(fallback.samples[1].timeProgress).toBe(fallback.samples[1].progress);
    expect(fallback.samples[1].progress).toBeLessThan(0.35);

    const onVertices = sampleWeatherAlongGeometry({
      points: waypoints,
      durationMin: 40,
      departAt,
      verticesOnly: true,
      legs: invented,
    });
    expect(onVertices.map((sample) => sample.timeProgress)).toEqual(
      onVertices.map((sample) => sample.progress),
    );

    const mismatched = resolveRouteWeatherSamples({
      roadGeometry: line,
      providerDurationMin: 100,
      providerLegs: [{ distanceM: 10, durationMin: 5 }],
      fallbackPoints: waypoints.slice(0, 2),
      fallbackDurationMin: 30,
      departAt,
    });
    expect(mismatched.usedRoadGeometry).toBe(true);
    expect(mismatched.appliedLegs).toBeNull();
    expect(mismatched.samples[1].timeProgress).toBeCloseTo(
      mismatched.samples[1].progress,
      10,
    );
    expect(mismatched.samples[1].at.getTime()).toBe(
      departAt.getTime() +
        Math.round(100 * 60_000 * mismatched.samples[1].progress),
    );

    const unplacedWait = sampleWeatherAlongGeometry({
      points: line,
      durationMin: 100,
      departAt,
      legs: [
        { distanceM: 0, durationMin: 40 },
        { distanceM: 100, durationMin: 60 },
      ],
    });
    expect(unplacedWait[1].timeProgress).toBeCloseTo(unplacedWait[1].progress, 10);
  });
});
