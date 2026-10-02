import { RecommendService } from './recommend.service';
import type { ElevationPort } from '../elevation/elevation.port';

describe('RecommendService alpine foundation', () => {
  function service(input?: {
    activityType?: 'alpine_skiing' | 'snowboarding';
    elevations?: Array<number | null>;
  }) {
    const activityType = input?.activityType ?? 'alpine_skiing';
    const elevations = input?.elevations ?? [1000, 1800];
    const route = {
      id: 'route-hill',
      name: 'Manual pins',
      description: null,
      activityType,
      routeKind: 'point_to_point',
      category: null,
      isFavorite: false,
      isDefaultCommute: false,
      startLat: 61,
      startLon: 8,
      startLabel: 'Base',
      endLat: 61.2,
      endLon: 8.2,
      endLabel: 'Summit',
      typicalDurationMin: 60,
      preferencesJson: '{}',
      waypoints: [
        { sortOrder: 0, lat: 61, lon: 8, label: 'Base' },
        { sortOrder: 1, lat: 61.2, lon: 8.2, label: 'Summit' },
      ],
    };
    const personalOffset = jest.fn();
    const userProfile = jest.fn();
    const roadWeatherSource = jest.fn();
    const forRouteSamples = jest.fn(
      (
        samples: Array<{
          lat: number;
          lon: number;
          altitudeM: number | null;
        }>,
      ) => ({
        provider: 'met',
        sampledAt: '2026-10-02T09:00:00.000Z',
        points: samples.map((sample) => ({
          lat: 0,
          lon: 0,
          airTempC: (sample.altitudeM ?? 0) >= 1600 ? -8 : 3,
          precipitationProbPct: 10,
          precipitationMm: 0,
          windSpeedMs: (sample.altitudeM ?? 0) >= 1600 ? 11 : 2,
        })),
        minTempC: -8,
        maxTempC: 3,
        maxRainProbPct: 10,
        maxPrecipMm: 0,
        maxWindMs: 11,
      }),
    );
    const elevationPort: ElevationPort = {
      groundElevations: jest.fn((points) => ({
        provider: elevations.some((height) => height != null)
          ? 'kartverket'
          : 'none',
        attribution: elevations.some((height) => height != null)
          ? '© Kartverket'
          : null,
        points: points.map((point, index) => ({
          ...point,
          elevationM: elevations[index] ?? null,
        })),
      })),
    };
    const recommend = new RecommendService(
      {
        get: jest.fn(() => route),
        getDefault: jest.fn(() => route),
        touchLastUsed: jest.fn(() => undefined),
        weatherPointsFor: jest.fn(),
      } as never,
      { forRouteSamples } as never,
      {
        userProfile: { findUnique: userProfile },
        personalOffset: { findUnique: personalOffset },
        garment: {
          findMany: jest.fn(() => [
            {
              id: 'shell',
              name: 'Ski shell',
              category: 'shell_jacket',
              layer: 'outer',
              primaryBodyZone: 'torso',
              warmthTier: 3,
              windResistTier: 4,
              waterResistTier: 4,
              breathabilityTier: 3,
              material: 'textile',
              hasVentilation: false,
              isHeated: false,
              activityTagsJson: '["alpine_skiing"]',
              components: [],
            },
          ]),
        },
      } as never,
      { isConfigured: true, roadWeatherSource } as never,
      elevationPort,
    );
    return {
      recommend,
      personalOffset,
      userProfile,
      roadWeatherSource,
      forRouteSamples,
    };
  }

  it('forecasts base, estimated mid, and upper at their own elevations', async () => {
    const {
      recommend,
      personalOffset,
      userProfile,
      roadWeatherSource,
      forRouteSamples,
    } = service();
    const result = await recommend.forUser(
      'user-1',
      'route-hill',
      '2026-10-02T09:00:00.000Z',
      undefined,
      'lift',
    );

    expect(roadWeatherSource).not.toHaveBeenCalled();
    expect(personalOffset).not.toHaveBeenCalled();
    expect(userProfile).toHaveBeenCalled();
    const samples = forRouteSamples.mock.calls[0][0] as Array<{
      lat: number;
      lon: number;
      altitudeM: number;
    }>;
    expect(samples).toEqual([
      expect.objectContaining({ lat: 61, lon: 8, altitudeM: 1000 }),
      expect.objectContaining({ altitudeM: 1400 }),
      expect.objectContaining({ lat: 61.2, lon: 8.2, altitudeM: 1800 }),
    ]);
    expect(samples[1].lat).toBeGreaterThan(61);
    expect(samples[1].lat).toBeLessThan(61.2);
    expect(
      samples.some(
        (sample) => sample.lat === 61.2 && sample.altitudeM === 1000,
      ),
    ).toBe(false);
    expect(result.recommendation.engine).toBe('alpine_v1');
    expect(result.recommendation.discipline).toBe('alpine_skiing');
    expect(result.recommendation.elevation).toBe('used');
    expect(result.recommendation.exposure.villageUsedAsSummit).toBe(false);
    expect(result.recommendation.exposure.upperTempC).toBe(-8);
    expect(result.recommendation.exposure.baseTempC).toBe(3);
    expect(result.recommendation.exposure.wornFrom).toBe('upper');
    expect(result.comfort.personalColdBiasC).toBe(0);
    expect(JSON.stringify(result.recommendation.exposure)).not.toContain(
      'motorcycleExposure',
    );
  });

  it('keeps snowboarding on the same engine', async () => {
    const { recommend, roadWeatherSource } = service({
      activityType: 'snowboarding',
    });
    const result = await recommend.forUser(
      'user-1',
      'route-hill',
      undefined,
      undefined,
      'hike',
    );
    expect(roadWeatherSource).not.toHaveBeenCalled();
    expect(result.route.activityType).toBe('snowboarding');
    expect(result.recommendation.discipline).toBe('snowboarding');
    expect(result.recommendation.engine).toBe('alpine_v1');
    expect(result.comfort.exposureMode).toBe('hike');
  });

  it('does not fetch the summit at the village elevation when the upper height is missing', async () => {
    const { recommend, forRouteSamples } = service({
      elevations: [400, null],
    });
    const result = await recommend.forUser(
      'user-1',
      'route-hill',
      undefined,
      undefined,
      'lift',
    );
    expect(forRouteSamples).toHaveBeenCalledTimes(1);
    expect(forRouteSamples.mock.calls[0][0]).toEqual([
      expect.objectContaining({ lat: 61, lon: 8, altitudeM: 400 }),
    ]);
    expect(result.recommendation.exposure.villageUsedAsSummit).toBe(false);
    expect(result.recommendation.exposure.upperTempC).toBeNull();
    expect(
      result.recommendation.exposure.samples.every(
        (sample: { role: string }) => sample.role !== 'upper',
      ),
    ).toBe(true);
    expect(result.recommendation.reasonCodes).toEqual(
      expect.arrayContaining([
        'UPPER_ELEVATION_UNAVAILABLE',
        'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
      ]),
    );
    expect(result.recommendation.confidence.level).toBe('LOW');
  });

  it('does not call the weather provider when no site has a height', async () => {
    const { recommend, forRouteSamples } = service({
      elevations: [null, null],
    });
    const result = await recommend.forUser('user-1', 'route-hill');
    expect(forRouteSamples).not.toHaveBeenCalled();
    expect(result.recommendation.exposure.villageUsedAsSummit).toBe(false);
    expect(result.recommendation.exposure.wornFrom).toBe('unavailable');
    expect(result.weather.provider).toBe('none');
    expect(result.recommendation.reasonCodes).toEqual(
      expect.arrayContaining(['VILLAGE_WEATHER_NOT_USED_AS_SUMMIT']),
    );
  });
});
