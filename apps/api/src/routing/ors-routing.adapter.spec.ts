import {
  HEIGIT_ORS_BASE_URL,
  ORS_CYCLING_REGULAR_PROFILE,
  ORS_DRIVING_CAR_PROFILE,
} from './ors.constants';
import {
  mapOrsDirections,
  OpenRouteServiceRoutingAdapter,
  type RoutePreviewResult,
} from './ors-routing.adapter';
import type { OrsHttpPost } from './ors.http';
import type { GeoPoint } from './routing.types';
import { analyzePlanRoute } from './plan-with-routing';
import type { RoutingPort } from './routing.port';

const waypoints: GeoPoint[] = [
  { lat: 58.1467, lon: 7.9956 },
  { lat: 58.1599, lon: 8.018 },
  { lat: 58.2, lon: 8.08 },
];

const orsBody = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [7.9956, 58.1467],
          [8.002, 58.15],
          [8.018, 58.1599],
          [8.04, 58.18],
          [8.08, 58.2],
        ],
      },
      properties: {
        summary: { distance: 18500.4, duration: 1320.2 },
        segments: [
          { distance: 8000.2, duration: 540 },
          { distance: 10500.2, duration: 780.2 },
        ],
      },
    },
  ],
};

describe('OpenRouteServiceRoutingAdapter', () => {
  function adapterWith(post: OrsHttpPost, apiKey = 'test-key') {
    return new OpenRouteServiceRoutingAdapter({
      apiKey,
      baseUrl: 'https://api.openrouteservice.org/v2',
      post,
    });
  }

  it('maps road geometry, distance, duration, and multiple waypoint legs', async () => {
    let postedUrl = '';
    let postedBody: Record<string, unknown> = {};
    let auth = '';
    const adapter = adapterWith(async (url, body, headers) => {
      postedUrl = url;
      postedBody = body as Record<string, unknown>;
      auth = headers.Authorization;
      return { status: 200, data: orsBody };
    });

    const analysis = await adapter.analyze({
      waypoints,
      preferences: { avoidMotorways: true },
      travelProfile: 'motorcycle',
    });

    expect(postedUrl).toBe(
      `${HEIGIT_ORS_BASE_URL}/v2/directions/driving-car/geojson`,
    );
    expect(postedUrl.includes('api.openrouteservice.org')).toBe(false);
    expect(auth).toBe('test-key');
    expect(postedBody.coordinates).toEqual([
      [7.9956, 58.1467],
      [8.018, 58.1599],
      [8.08, 58.2],
    ]);
    expect(postedBody.options).toEqual({ avoid_features: ['highways'] });

    expect(analysis).not.toBeNull();
    expect(analysis!.distanceM).toBe(18500);
    expect(analysis!.durationMin).toBe(22);
    expect(analysis!.travelSegments).toHaveLength(2);
    expect(analysis!.travelSegments[0].distanceM).toBe(8000);
    expect(analysis!.travelSegments[0].durationMin).toBe(9);
    expect(analysis!.travelSegments[1].durationMin).toBe(13);
    expect(analysis!.travelSegments[0].start).toEqual(waypoints[0]);
    expect(analysis!.travelSegments[1].end).toEqual(waypoints[2]);
    expect(
      analysis!.travelSegments.every((segment) => segment.expectedSpeedKmh > 0),
    ).toBe(true);
    expect(analysis!.meta).toMatchObject({
      provider: 'ors',
      fromProvider: true,
      fallback: false,
    });
    expect(analysis!.preferencesApplied.avoidMotorways).toBe(true);
    expect(analysis!.geometry.encoding).toBe('none');
    expect(analysis!.geometry.points).toEqual(waypoints);
    expect(analysis!.geometry.data).toBeNull();
  });

  it('requests the interim cycling profile only when travelProfile is cycling', async () => {
    const urls: string[] = [];
    const adapter = adapterWith((url) => {
      urls.push(url);
      return { status: 200, data: orsBody };
    });

    await adapter.roadWeatherSource({
      waypoints,
      travelProfile: 'cycling',
    });
    await adapter.analyze({ waypoints, travelProfile: 'motorcycle' });
    await adapter.analyze({ waypoints, travelProfile: 'drive' });
    const preview = await adapter.preview({
      waypoints,
      travelProfile: 'cycling',
    });

    expect(urls[0]).toBe(
      `${HEIGIT_ORS_BASE_URL}/v2/directions/${ORS_CYCLING_REGULAR_PROFILE}/geojson`,
    );
    expect(urls[1]).toBe(
      `${HEIGIT_ORS_BASE_URL}/v2/directions/${ORS_DRIVING_CAR_PROFILE}/geojson`,
    );
    expect(urls[2]).toBe(
      `${HEIGIT_ORS_BASE_URL}/v2/directions/${ORS_DRIVING_CAR_PROFILE}/geojson`,
    );
    expect(preview).toMatchObject({
      travelMode: 'cycling',
      noticeCode: 'CYCLING_GEOMETRY',
    });
    expect(preview!.providerWarning.toLowerCase()).not.toContain('motorcycle');
    expect(preview!.providerWarning.toLowerCase()).toContain(
      'not a surface-quality',
    );
  });

  it('omits avoid_features when avoidMotorways is false', async () => {
    let postedBody: Record<string, unknown> = {};
    const adapter = adapterWith(async (_url, body) => {
      postedBody = body as Record<string, unknown>;
      return { status: 200, data: orsBody };
    });
    await adapter.analyze({ waypoints: waypoints.slice(0, 2) });
    expect(postedBody.options).toBeUndefined();
  });

  it('returns dense road points from preview without treating them as stored geometry', async () => {
    const adapter = adapterWith(async () => ({ status: 200, data: orsBody }));
    const preview = await adapter.preview({
      waypoints,
      preferences: { avoidMotorways: true },
    });
    expect(preview).toMatchObject({
      distanceM: 18500,
      durationMin: 22,
      travelMode: 'driving',
      usedFallbackTravelMode: false,
      noticeCode: 'DRIVING_GEOMETRY',
    } satisfies Partial<RoutePreviewResult>);
    expect(preview!.points).toHaveLength(5);
    expect(preview!.points[0]).toEqual({ lat: 58.1467, lon: 7.9956 });
    expect(preview!.providerWarning.toLowerCase()).toContain('not motorcycle');
    expect(preview).not.toHaveProperty('legs');
  });

  it('returns ephemeral provider legs for weather sampling and does not store the line', async () => {
    const adapter = adapterWith(async () => ({ status: 200, data: orsBody }));
    const source = await adapter.roadWeatherSource({ waypoints });
    expect(source).toEqual({
      points: [
        { lat: 58.1467, lon: 7.9956 },
        { lat: 58.15, lon: 8.002 },
        { lat: 58.1599, lon: 8.018 },
        { lat: 58.18, lon: 8.04 },
        { lat: 58.2, lon: 8.08 },
      ],
      distanceM: 18500,
      durationMin: 22,
      legs: [
        { distanceM: 8000, durationMin: 9 },
        { distanceM: 10500, durationMin: 13 },
      ],
    });

    const analysis = await adapter.analyze({ waypoints });
    expect(analysis!.geometry).toEqual({
      encoding: 'none',
      data: null,
      points: waypoints,
    });
  });

  it('omits leg timing when the provider segment count does not match the waypoints', async () => {
    const mismatched = {
      ...orsBody,
      features: [
        {
          ...orsBody.features[0],
          properties: {
            ...orsBody.features[0].properties,
            segments: [{ distance: 18500.4, duration: 1320.2 }],
          },
        },
      ],
    };
    const adapter = adapterWith(async () => ({ status: 200, data: mismatched }));
    const source = await adapter.roadWeatherSource({ waypoints });
    expect(source!.points).toHaveLength(5);
    expect(source!.legs).toBeNull();
    expect(source!.durationMin).toBe(22);
  });

  it('returns null on provider errors and does not throw', async () => {
    const httpError = adapterWith(async () => ({ status: 403, data: { error: 'nope' } }));
    await expect(httpError.analyze({ waypoints })).resolves.toBeNull();

    const network = adapterWith(async () => {
      throw new Error('socket hang up');
    });
    await expect(network.analyze({ waypoints })).resolves.toBeNull();
    await expect(network.preview({ waypoints })).resolves.toBeNull();

    const empty = adapterWith(async () => ({
      status: 200,
      data: { type: 'FeatureCollection', features: [] },
    }));
    await expect(empty.analyze({ waypoints })).resolves.toBeNull();
  });

  it('stays unconfigured without an API key', async () => {
    const adapter = adapterWith(async () => {
      throw new Error('should not be called');
    }, '  ');
    expect(adapter.isConfigured).toBe(false);
    await expect(adapter.analyze({ waypoints })).resolves.toBeNull();
  });
});

describe('mapOrsDirections', () => {
  it('rejects a payload without a summary', () => {
    expect(
      mapOrsDirections(
        {
          type: 'FeatureCollection',
          features: [
            {
              geometry: { type: 'LineString', coordinates: [[8, 58], [8.1, 58.1]] },
              properties: {},
            },
          ],
        },
        waypoints.slice(0, 2),
        {},
      ),
    ).toBeNull();
  });
});

describe('analyzePlanRoute provider fallback', () => {
  const hintPort: RoutingPort = {
    async analyze() {
      return null;
    },
  };

  it('falls back to the duration hint when the provider fails', async () => {
    const analysis = await analyzePlanRoute({
      port: hintPort,
      waypoints: waypoints.slice(0, 2),
      preferences: { avoidMotorways: true },
      departAt: new Date('2026-09-11T07:30:00.000Z'),
      durationHintMin: 45,
    });
    expect(analysis!.meta.fallback).toBe(true);
    expect(analysis!.meta.provider).toBe('null');
    expect(analysis!.durationMin).toBe(45);
    expect(analysis!.geometry.encoding).toBe('none');
  });

  it('keeps provider distance and duration and strips dense geometry', async () => {
    const dense: GeoPoint[] = [
      waypoints[0],
      { lat: 58.15, lon: 8.0 },
      { lat: 58.155, lon: 8.01 },
      waypoints[1],
    ];
    const port: RoutingPort = {
      async analyze() {
        return {
          distanceM: 18500,
          durationMin: 22,
          geometry: { encoding: 'geojson', data: 'line', points: dense },
          travelSegments: [
            {
              index: 0,
              durationMin: 22,
              expectedSpeedKmh: 50.5,
              distanceM: 18500,
              start: waypoints[0],
              end: waypoints[1],
            },
          ],
          preferencesApplied: { avoidMotorways: false },
          meta: {
            provider: 'ors',
            fromProvider: true,
            fallback: false,
            analyzedAt: '2026-10-01T00:00:00.000Z',
          },
        };
      },
    };
    const analysis = await analyzePlanRoute({
      port,
      waypoints: waypoints.slice(0, 2),
      departAt: new Date('2026-09-11T07:30:00.000Z'),
      durationHintMin: 45,
    });
    expect(analysis!.durationMin).toBe(22);
    expect(analysis!.distanceM).toBe(18500);
    expect(analysis!.meta.fromProvider).toBe(true);
    expect(analysis!.geometry).toEqual({
      encoding: 'none',
      data: null,
      points: [waypoints[0], waypoints[1]],
    });
  });
});
