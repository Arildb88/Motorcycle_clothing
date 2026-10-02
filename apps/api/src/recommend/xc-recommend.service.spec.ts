import { RecommendService } from './recommend.service';
import type { ElevationPort } from '../elevation/elevation.port';

describe('RecommendService cross-country foundation', () => {
  function service(input?: {
    elevations?: Array<number | null>;
    typicalDurationMin?: number | null;
    garments?: Array<Record<string, unknown>>;
  }) {
    const elevations = input?.elevations ?? [180, null];
    const route = {
      id: 'route-track',
      name: 'Lake loop',
      description: null,
      activityType: 'xc_skiing',
      routeKind: 'loop',
      category: null,
      isFavorite: false,
      isDefaultCommute: false,
      startLat: 60.1,
      startLon: 10.1,
      startLabel: 'Start',
      endLat: 60.4,
      endLon: 10.4,
      endLabel: 'Finish',
      typicalDurationMin:
        input && 'typicalDurationMin' in input ? input.typicalDurationMin : 90,
      preferencesJson: '{}',
      waypoints: [
        { sortOrder: 1, lat: 60.4, lon: 10.4, label: 'Finish' },
        { sortOrder: 0, lat: 60.1, lon: 10.1, label: 'Start' },
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
          at: Date;
          altitudeM: number | null;
        }>,
      ) => ({
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: samples.map(() => ({
          lat: 0,
          lon: 0,
          airTempC: 2,
          precipitationProbPct: 10,
          precipitationMm: 0,
          windSpeedMs: 4,
          groundElevationM: 999,
        })),
        minTempC: 2,
        maxTempC: 2,
        maxRainProbPct: 10,
        maxPrecipMm: 0,
        maxWindMs: 4,
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
        weatherPointsFor: jest.fn(() => {
          throw new Error('xc skiing must not ask for a road sample line');
        }),
      } as never,
      { forRouteSamples } as never,
      {
        userProfile: { findUnique: userProfile },
        personalOffset: { findUnique: personalOffset },
        garment: {
          findMany: jest.fn(
            () =>
              input?.garments ?? [
                {
                  id: 'shell',
                  name: 'XC vest',
                  category: 'shell_jacket',
                  layer: 'outer',
                  primaryBodyZone: 'torso',
                  warmthTier: 2,
                  windResistTier: 3,
                  waterResistTier: 3,
                  breathabilityTier: 4,
                  material: 'textile',
                  hasVentilation: true,
                  isHeated: false,
                  activityTagsJson: '["xc_skiing"]',
                  components: [],
                },
                {
                  id: 'alpine-shell',
                  name: 'Alpine shell',
                  category: 'shell_jacket',
                  layer: 'outer',
                  primaryBodyZone: 'torso',
                  warmthTier: 4,
                  windResistTier: 5,
                  waterResistTier: 5,
                  breathabilityTier: 2,
                  material: 'textile',
                  hasVentilation: false,
                  isHeated: false,
                  activityTagsJson: '["alpine_skiing"]',
                  components: [],
                },
              ],
          ),
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

  it('samples the saved line with each point elevation and the user duration', async () => {
    const {
      recommend,
      personalOffset,
      userProfile,
      roadWeatherSource,
      forRouteSamples,
    } = service();
    const result = await recommend.forUser(
      'user-1',
      'route-track',
      '2026-10-02T08:00:00.000Z',
      'easy',
      undefined,
      'skate',
    );

    expect(roadWeatherSource).not.toHaveBeenCalled();
    expect(personalOffset).toHaveBeenCalledWith({
      where: {
        userId_activityType_zone: {
          userId: 'user-1',
          activityType: 'xc_skiing',
          zone: 'overall',
        },
      },
    });
    expect(userProfile).toHaveBeenCalled();
    const samples = forRouteSamples.mock.calls[0][0] as Array<{
      lat: number;
      lon: number;
      at: Date;
      altitudeM: number | null;
    }>;
    expect(samples).toEqual([
      expect.objectContaining({
        lat: 60.1,
        lon: 10.1,
        altitudeM: 180,
      }),
      expect.objectContaining({
        lat: 60.4,
        lon: 10.4,
        altitudeM: null,
      }),
    ]);
    expect(samples[0].at.toISOString()).toBe('2026-10-02T08:00:00.000Z');
    expect(samples[1].at.toISOString()).toBe('2026-10-02T09:30:00.000Z');
    expect(result.recommendation.engine).toBe('xc_v1');
    expect(result.recommendation.line).toBe('user_waypoints');
    expect(result.recommendation.style).toBe('skate');
    expect(result.comfort.intensity).toBe('easy');
    expect(result.comfort.personalColdBiasC).toBe(0);
    expect(result.recommendation.elevation).toBe('partial');
    const segments = result.recommendation.exposure.segments as Array<{
      groundElevationM: number | null;
      forecastAt: string | null;
    }>;
    expect(segments[1].groundElevationM).toBeNull();
    expect(segments[1].forecastAt).toBe('2026-10-02T09:30:00.000Z');
    const selected = [
      ...result.recommendation.wear,
      ...result.recommendation.pack,
    ].map((item: { garmentId?: string }) => item.garmentId);
    expect(selected).toContain('shell');
    expect(selected).not.toContain('alpine-shell');
    expect(JSON.stringify(result.recommendation.exposure)).not.toContain(
      'motorcycleExposure',
    );
    expect(result.personalization.reason).toContain('road routing');
  });

  it('uses the default duration when the route has none, still without a router', async () => {
    const { recommend, roadWeatherSource, forRouteSamples } = service({
      typicalDurationMin: null,
      elevations: [400, 500],
    });
    const result = await recommend.forUser(
      'user-1',
      'route-track',
      '2026-10-02T07:00:00.000Z',
      'steady',
      undefined,
      'classic',
    );
    expect(roadWeatherSource).not.toHaveBeenCalled();
    const samples = forRouteSamples.mock.calls[0][0] as Array<{
      at: Date;
      altitudeM: number | null;
    }>;
    expect(samples[1].at.toISOString()).toBe('2026-10-02T09:00:00.000Z');
    expect(samples.map((sample) => sample.altitudeM)).toEqual([400, 500]);
    expect(result.comfort.durationAssumed).toBe(true);
    expect(result.recommendation.style).toBe('classic');
    expect(
      result.recommendation.reasons.map((reason) => reason.code),
    ).toContain('ASSUMED_DURATION');
    expect(
      result.recommendation.reasons.map((reason) => reason.code),
    ).toContain('CLASSIC_BOOTS_ARE_EQUIPMENT');
  });
});
