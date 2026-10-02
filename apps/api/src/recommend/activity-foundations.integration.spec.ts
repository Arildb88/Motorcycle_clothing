import { RecommendService } from './recommend.service';
import type { ElevationPort } from '../elevation/elevation.port';

/**
 * One RecommendService entry for every completed activity foundation.
 * Separate engine specs do not show that a later activity reuses the
 * previous activity's offsets, road profile, or ground height.
 */
describe('activity foundation integration', () => {
  type Activity =
    'motorcycle' | 'cycling' | 'alpine_skiing' | 'snowboarding' | 'xc_skiing';

  type WeatherRequest = {
    lat: number;
    lon: number;
    altitudeM: number | null;
  };

  function routeFor(activityType: Activity) {
    const alpine =
      activityType === 'alpine_skiing' || activityType === 'snowboarding';
    return {
      id: `route-${activityType}`,
      name: activityType,
      description: null,
      activityType,
      routeKind: 'point_to_point',
      category: null,
      isFavorite: false,
      isDefaultCommute: false,
      startLat: alpine ? 61 : 59.91,
      startLon: alpine ? 8 : 10.75,
      startLabel: alpine ? 'Base' : 'Start',
      endLat: alpine ? 61.02 : 59.95,
      endLon: alpine ? 8.02 : 10.8,
      endLabel: alpine ? 'Summit' : 'End',
      typicalDurationMin: 60,
      preferencesJson: '{}',
      waypoints: alpine
        ? [
            { sortOrder: 0, lat: 61, lon: 8, label: 'Base' },
            { sortOrder: 1, lat: 61.02, lon: 8.02, label: 'Summit' },
          ]
        : [
            { sortOrder: 0, lat: 59.91, lon: 10.75, label: 'Start' },
            { sortOrder: 1, lat: 59.95, lon: 10.8, label: 'End' },
          ],
    };
  }

  function harness() {
    let current = routeFor('motorcycle');
    const personalOffset = jest.fn(() => ({ n: 0, meanResidual: 0 }));
    const userProfile = jest.fn(() => ({ coldSensitivity: 1 }));
    const roadWeatherSource = jest.fn(() => ({
      points: [
        { lat: 59.91, lon: 10.75 },
        { lat: 59.95, lon: 10.8 },
      ],
      distanceM: 8000,
      durationMin: 20,
      legs: [{ distanceM: 8000, durationMin: 20 }],
    }));
    const forRouteSamples = jest.fn((samples: WeatherRequest[]) => ({
      provider: 'met',
      sampledAt: '2026-10-02T12:00:00.000Z',
      points: samples.map((sample) => ({
        lat: sample.lat,
        lon: sample.lon,
        airTempC: sample.altitudeM != null && sample.altitudeM >= 1500 ? -6 : 8,
        precipitationProbPct: 10,
        precipitationMm: 0,
        windSpeedMs: 3,
        ...(sample.altitudeM != null
          ? { groundElevationM: Math.round(sample.altitudeM) }
          : {}),
      })),
      minTempC: -6,
      maxTempC: 8,
      maxRainProbPct: 10,
      maxPrecipMm: 0,
      maxWindMs: 3,
    }));
    const plans: Array<Array<number | null> | number> = [
      120,
      90,
      [400, 1600],
      [400, 1600],
      [220, null],
    ];
    let elevationCall = 0;
    const elevations: ElevationPort = {
      groundElevations: jest.fn((points) => {
        const plan = plans[elevationCall] ?? null;
        elevationCall += 1;
        const heights = points.map((_, index) => {
          if (typeof plan === 'number') return plan;
          if (Array.isArray(plan)) return plan[index] ?? null;
          return null;
        });
        const any = heights.some((height) => height != null);
        return {
          provider: any ? 'kartverket' : 'none',
          attribution: any ? '© Kartverket' : null,
          points: points.map((point, index) => ({
            ...point,
            elevationM: heights[index],
          })),
        };
      }),
    };
    const recommend = new RecommendService(
      {
        get: jest.fn(() => current),
        getDefault: jest.fn(() => current),
        touchLastUsed: jest.fn(() => undefined),
        weatherPointsFor: jest.fn(() =>
          current.waypoints.map((waypoint) => ({
            lat: waypoint.lat,
            lon: waypoint.lon,
          })),
        ),
      } as never,
      { forRouteSamples } as never,
      {
        userProfile: { findUnique: userProfile },
        personalOffset: { findUnique: personalOffset },
        garment: { findMany: jest.fn(() => []) },
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
      use: (activity: Activity) => {
        current = routeFor(activity);
      },
    };
  }

  function altitudes(
    mock: { mock: { calls: Array<[WeatherRequest[]]> } },
    call: number,
  ): Array<number | null> {
    return mock.mock.calls[call][0].map((sample) => sample.altitudeM);
  }

  it('keeps engines, offsets, routing, and elevations on the activity that owns them', async () => {
    const {
      recommend,
      personalOffset,
      userProfile,
      roadWeatherSource,
      forRouteSamples,
      use,
    } = harness();

    use('motorcycle');
    const motorcycle = await recommend.forUser('user-1', 'route-motorcycle');
    use('cycling');
    const cycling = await recommend.forUser(
      'user-1',
      'route-cycling',
      undefined,
      'steady',
    );
    use('alpine_skiing');
    const alpine = await recommend.forUser('user-1', 'route-alpine_skiing');
    use('snowboarding');
    const snowboard = await recommend.forUser(
      'user-1',
      'route-snowboarding',
      undefined,
      undefined,
      'lift',
    );
    use('xc_skiing');
    const xc = await recommend.forUser(
      'user-1',
      'route-xc_skiing',
      undefined,
      'easy',
      undefined,
      'classic',
    );

    expect(motorcycle.recommendation.engine).toBe('motorcycle_v1');
    expect(motorcycle.route.activityType).toBe('motorcycle');
    expect(motorcycle.comfort.personalColdBiasC).toBe(-1);
    expect(personalOffset).toHaveBeenCalledTimes(5);
    expect(userProfile).toHaveBeenCalledTimes(5);
    expect(
      altitudes(forRouteSamples, 0).every((height) => height === 120),
    ).toBe(true);

    expect(cycling.recommendation.engine).toBe('cycling_v1');
    expect(cycling.comfort.personalColdBiasC).toBe(0);
    expect(cycling.comfort.intensity).toBe('steady');
    expect(cycling.recommendation.geometry).toBe('cycling_profile');
    expect(personalOffset).toHaveBeenCalledTimes(5);
    expect(userProfile).toHaveBeenCalledTimes(5);
    expect(altitudes(forRouteSamples, 1).every((height) => height === 90)).toBe(
      true,
    );

    expect(alpine.recommendation.engine).toBe('alpine_v1');
    expect(alpine.recommendation.discipline).toBe('alpine_skiing');
    expect(alpine.comfort.personalColdBiasC).toBe(0);
    expect(alpine.recommendation.exposure.villageUsedAsSummit).toBe(false);
    const alpineHeights = altitudes(forRouteSamples, 2);
    expect(alpineHeights).toEqual(expect.arrayContaining([400, 1600]));
    expect(Math.max(...(alpineHeights as number[]))).toBe(1600);
    expect(alpineHeights).not.toContain(120);
    expect(alpineHeights).not.toContain(90);

    expect(snowboard.recommendation.engine).toBe('alpine_v1');
    expect(snowboard.recommendation.discipline).toBe('snowboarding');
    expect(snowboard.comfort.exposureMode).toBe('lift');
    expect(altitudes(forRouteSamples, 3)).toEqual(
      expect.arrayContaining([400, 1600]),
    );

    expect(xc.recommendation.engine).toBe('xc_v1');
    expect(xc.recommendation.style).toBe('classic');
    expect(xc.comfort.personalColdBiasC).toBe(0);
    expect(xc.comfort.intensity).toBe('easy');
    expect(altitudes(forRouteSamples, 4)).toEqual([220, null]);
    expect(personalOffset).toHaveBeenCalledTimes(5);
    const offsetCalls = personalOffset.mock.calls as unknown as Array<
      [
        {
          where: {
            userId_activityType_zone: { activityType: string };
          };
        },
      ]
    >;
    expect(
      offsetCalls.map(
        (call) => call[0].where.userId_activityType_zone.activityType,
      ),
    ).toEqual([
      'motorcycle',
      'cycling',
      'alpine_skiing',
      'snowboarding',
      'xc_skiing',
    ]);
    expect(userProfile).toHaveBeenCalledTimes(5);

    expect(roadWeatherSource).toHaveBeenCalledTimes(2);
    expect(roadWeatherSource).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ travelProfile: 'drive' }),
    );
    expect(roadWeatherSource).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ travelProfile: 'cycling' }),
    );

    const engines = [
      motorcycle.recommendation.engine,
      cycling.recommendation.engine,
      alpine.recommendation.engine,
      xc.recommendation.engine,
    ];
    expect(new Set(engines).size).toBe(4);
  });
});
