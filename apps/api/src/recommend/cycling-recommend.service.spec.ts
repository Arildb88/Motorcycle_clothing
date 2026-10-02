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
  }) {
    const personalOffset = jest.fn();
    const userProfile = jest.fn();
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

    expect(personalOffset).not.toHaveBeenCalled();
    expect(userProfile).not.toHaveBeenCalled();
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
});
