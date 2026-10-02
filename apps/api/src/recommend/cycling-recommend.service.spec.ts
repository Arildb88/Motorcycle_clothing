import { RecommendService } from './recommend.service';
import type { ElevationPort } from '../elevation/elevation.port';

describe('RecommendService cycling foundation', () => {
  const route = {
    id: 'route-bike',
    name: 'Oslo loop',
    description: null,
    activityType: 'cycling',
    routeKind: 'point_to_point',
    category: null,
    isFavorite: false,
    isDefaultCommute: false,
    startLat: 59.91,
    startLon: 10.75,
    startLabel: 'Start',
    endLat: 59.95,
    endLon: 10.8,
    endLabel: 'End',
    typicalDurationMin: 50,
    preferencesJson: '{}',
    waypoints: [
      { sortOrder: 0, lat: 59.91, lon: 10.75, label: 'Start' },
      { sortOrder: 1, lat: 59.95, lon: 10.8, label: 'End' },
    ],
  };

  function service(overrides?: {
    road?: {
      points: Array<{ lat: number; lon: number }>;
      distanceM: number;
      durationMin: number;
      legs: Array<{ distanceM: number; durationMin: number }> | null;
    } | null;
    elevationM?: number | null;
    offset?: { n: number; meanResidual: number } | null;
    coldSensitivity?: number;
  }) {
    const personalOffset = jest.fn(() =>
      overrides && 'offset' in overrides ? overrides.offset : undefined,
    );
    const userProfile = jest.fn(() =>
      overrides?.coldSensitivity == null
        ? null
        : { coldSensitivity: overrides.coldSensitivity },
    );
    const roadWeatherSource = jest.fn(() =>
      overrides && 'road' in overrides
        ? overrides.road
        : {
            points: [
              { lat: 59.91, lon: 10.75 },
              { lat: 59.93, lon: 10.77 },
              { lat: 59.95, lon: 10.8 },
            ],
            distanceM: 12000,
            durationMin: 40,
            legs: [{ distanceM: 12000, durationMin: 40 }],
          },
    );
    const forRouteSamples = jest.fn(
      (samples: Array<{ altitudeM: number | null }>) => ({
        provider: 'met',
        sampledAt: '2026-10-02T12:00:00.000Z',
        points: samples.map((sample) => ({
          lat: 59.91,
          lon: 10.75,
          airTempC: 11,
          precipitationProbPct: 10,
          precipitationMm: 0,
          windSpeedMs: 4,
          ...(sample.altitudeM != null
            ? { groundElevationM: sample.altitudeM }
            : {}),
        })),
        minTempC: 11,
        maxTempC: 11,
        maxRainProbPct: 10,
        maxPrecipMm: 0,
        maxWindMs: 4,
      }),
    );
    const elevations: ElevationPort = {
      groundElevations: jest.fn((points) => ({
        provider: overrides?.elevationM == null ? 'none' : 'kartverket',
        attribution: overrides?.elevationM == null ? null : '© Kartverket',
        points: points.map((point) => ({
          ...point,
          elevationM:
            overrides?.elevationM === undefined ? 85 : overrides.elevationM,
        })),
      })),
    };
    const recommend = new RecommendService(
      {
        get: jest.fn(() => route),
        getDefault: jest.fn(() => route),
        touchLastUsed: jest.fn(() => undefined),
        weatherPointsFor: jest.fn(() =>
          route.waypoints.map((waypoint) => ({
            lat: waypoint.lat,
            lon: waypoint.lon,
          })),
        ),
      } as never,
      { forRouteSamples } as never,
      {
        userProfile: { findUnique: userProfile },
        personalOffset: { findUnique: personalOffset },
        garment: {
          findMany: jest.fn(() => [
            {
              id: 'jersey',
              name: 'Jersey',
              category: 'base_layer',
              layer: 'base',
              primaryBodyZone: 'torso',
              warmthTier: 2,
              windResistTier: 1,
              waterResistTier: 1,
              breathabilityTier: 4,
              material: 'synthetic',
              hasVentilation: false,
              isHeated: false,
              activityTagsJson: '["cycling"]',
              components: [],
            },
          ]),
        },
      } as never,
      { isConfigured: true, roadWeatherSource } as never,
      elevations,
    );
    return {
      recommend,
      personalOffset,
      userProfile,
      roadWeatherSource,
      forRouteSamples,
    };
  }

  it('samples a cycling route with elevation and does not apply motorcycle offsets', async () => {
    const {
      recommend,
      personalOffset,
      userProfile,
      roadWeatherSource,
      forRouteSamples,
    } = service();
    const result = await recommend.forUser(
      'user-1',
      'route-bike',
      undefined,
      'hard',
    );

    expect(personalOffset).toHaveBeenCalledWith({
      where: {
        userId_activityType_zone: {
          userId: 'user-1',
          activityType: 'cycling',
          zone: 'overall',
        },
      },
    });
    expect(userProfile).toHaveBeenCalled();
    expect(roadWeatherSource).toHaveBeenCalledWith(
      expect.objectContaining({ travelProfile: 'cycling' }),
    );
    expect(forRouteSamples).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ altitudeM: 85 })]),
    );
    expect(result.recommendation.engine).toBe('cycling_v1');
    expect(result.recommendation.elevation).toBe('used');
    expect(result.recommendation.geometry).toBe('cycling_profile');
    expect(result.comfort.intensity).toBe('hard');
    expect(result.comfort.personalColdBiasC).toBe(0);
    expect(result.personalization.canClaimPersonal).toBe(false);
    expect(JSON.stringify(result)).not.toContain('motorcycle_v1');
    expect(JSON.stringify(result.recommendation.exposure)).not.toContain(
      'motorcycleExposure',
    );
  });

  it('keeps a waypoint fallback when cycling routing is unavailable', async () => {
    const { recommend, roadWeatherSource } = service({
      road: null,
      elevationM: null,
    });
    const result = await recommend.forUser('user-1', 'route-bike');

    expect(roadWeatherSource).toHaveBeenCalledWith(
      expect.objectContaining({ travelProfile: 'cycling' }),
    );
    expect(result.recommendation.geometry).toBe('waypoint_fallback');
    expect(result.recommendation.elevation).toBe('unavailable');
    expect(result.recommendation.reasonCodes).toEqual(
      expect.arrayContaining([
        'ROUTE_GEOMETRY_FALLBACK',
        'ELEVATION_UNAVAILABLE',
        'ASSUMED_RIDE_STYLE',
      ]),
    );
    expect(result.recommendation.confidence.level).not.toBe('HIGH');
  });

  it('applies shrunk cycling feedback and ignores manual cold sensitivity', async () => {
    const neutral = service();
    const tuned = service({
      offset: { n: 6, meanResidual: 1 },
      coldSensitivity: 1,
    });
    const before = await neutral.recommend.forUser(
      'user-1',
      'route-bike',
      undefined,
      'steady',
    );
    const after = await tuned.recommend.forUser(
      'user-1',
      'route-bike',
      undefined,
      'steady',
    );

    expect(before.comfort.personalColdBiasC).toBe(0);
    expect(after.comfort.personalColdBiasC).toBeCloseTo(0.5, 10);
    expect(after.comfort.coldSensitivity).toBeNull();
    expect(after.recommendation.exposure.cyclingExposureSustainedC).toBeCloseTo(
      before.recommendation.exposure.cyclingExposureSustainedC - 0.5,
      5,
    );
    expect(after.personalization.canClaimPersonal).toBe(false);
    expect(tuned.personalOffset).toHaveBeenCalledWith({
      where: {
        userId_activityType_zone: {
          userId: 'user-1',
          activityType: 'cycling',
          zone: 'overall',
        },
      },
    });
  });

  it('reads wardrobe and thermal feedback while route weather is still in flight', async () => {
    let release: (value?: void) => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const order: string[] = [];
    const forRouteSamples = jest.fn(async () => {
      order.push('weather-start');
      await gate;
      order.push('weather-end');
      return {
        provider: 'met',
        sampledAt: '2026-10-02T12:00:00.000Z',
        points: [
          {
            lat: 59.91,
            lon: 10.75,
            airTempC: 11,
            precipitationProbPct: 0,
            precipitationMm: 0,
            windSpeedMs: 2,
          },
        ],
        minTempC: 11,
        maxTempC: 11,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 2,
      };
    });
    const recommend = new RecommendService(
      {
        get: jest.fn(() => route),
        touchLastUsed: jest.fn(() => undefined),
        weatherPointsFor: jest.fn(() => [
          { lat: 59.91, lon: 10.75 },
          { lat: 59.95, lon: 10.8 },
        ]),
      } as never,
      { forRouteSamples } as never,
      {
        userProfile: {
          findUnique: jest.fn(() => {
            order.push('profile');
            return null;
          }),
        },
        personalOffset: {
          findUnique: jest.fn(() => {
            order.push('offset');
            return null;
          }),
        },
        garment: {
          findMany: jest.fn(() => {
            order.push('wardrobe');
            return [];
          }),
        },
      } as never,
      {
        isConfigured: true,
        roadWeatherSource: jest.fn(() => ({
          points: [
            { lat: 59.91, lon: 10.75 },
            { lat: 59.95, lon: 10.8 },
          ],
          distanceM: 4000,
          durationMin: 20,
          legs: null,
        })),
      } as never,
      {
        groundElevations: jest.fn(
          (points: Array<{ lat: number; lon: number }>) => ({
            provider: 'none',
            attribution: null,
            points: points.map((point) => ({ ...point, elevationM: null })),
          }),
        ),
      },
    );

    const pending = recommend.forUser('user-1', 'route-bike');
    await new Promise((resolve) => setImmediate(resolve));
    expect(order).toContain('weather-start');
    expect(order).toContain('offset');
    expect(order).toContain('wardrobe');
    expect(order).not.toContain('weather-end');
    release();
    const result = await pending;
    expect(result.recommendation.engine).toBe('cycling_v1');
    expect(order).toContain('weather-end');
  });
});
