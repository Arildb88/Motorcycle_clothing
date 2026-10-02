import { RecommendService } from './recommend.service';
import type { ElevationPort } from '../elevation/elevation.port';

describe('RecommendService departure comparison', () => {
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

  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date('2026-10-02T12:00:00.000Z'),
      doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval'],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shifts one route sample set across nearby departures and does not rank them', async () => {
    const roadWeatherSource = jest.fn(() => ({
      points: [
        { lat: 59.91, lon: 10.75 },
        { lat: 59.95, lon: 10.8 },
      ],
      distanceM: 12000,
      durationMin: 60,
      legs: [{ distanceM: 12000, durationMin: 60 }],
    }));
    const forRouteSamples = jest.fn((samples: Array<{ at: Date }>) => ({
      provider: 'met',
      sampledAt: '2026-10-03T15:00:00.000Z',
      points: samples.map(() => ({
        lat: 59.91,
        lon: 10.75,
        airTempC: 11,
        precipitationProbPct: 10,
        precipitationMm: 0,
        windSpeedMs: 4,
      })),
      minTempC: 11,
      maxTempC: 11,
      maxRainProbPct: 10,
      maxPrecipMm: 0,
      maxWindMs: 4,
    }));
    const compareSampleGroups = jest.fn(
      (groups: Array<Array<{ lat: number; lon: number; at: Date }>>) =>
        groups.map((group) => ({
          available: true,
          variesByTime: true,
          missingAt: [],
          conditions: {
            minTempC: 4,
            maxTempC: 6,
            maxRainProbPct: 20,
            maxPrecipMm: 0.2,
            maxWindMs: 5,
            forecastFrom: group[0].at.toISOString(),
            forecastTo: group[group.length - 1].at.toISOString(),
          },
        })),
    );
    const groundElevations = jest.fn(
      (points: Array<{ lat: number; lon: number }>) => ({
        provider: 'kartverket',
        attribution: '© Kartverket',
        points: points.map((point) => ({ ...point, elevationM: 40 })),
      }),
    );
    const elevations: ElevationPort = {
      groundElevations,
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
      { forRouteSamples, compareSampleGroups } as never,
      {
        userProfile: { findUnique: jest.fn(() => null) },
        personalOffset: { findUnique: jest.fn(() => null) },
        garment: { findMany: jest.fn(() => []) },
      } as never,
      { isConfigured: true, roadWeatherSource } as never,
      elevations,
    );

    const result = await recommend.forUser(
      'user-1',
      'route-bike',
      '2026-10-03T15:00:00.000Z',
      'steady',
    );

    expect(roadWeatherSource).toHaveBeenCalledTimes(1);
    expect(groundElevations).toHaveBeenCalledTimes(1);
    expect(forRouteSamples).toHaveBeenCalledTimes(1);
    expect(compareSampleGroups).toHaveBeenCalledTimes(1);
    const groups = compareSampleGroups.mock.calls[0][0];
    expect(groups).toHaveLength(4);
    expect(groups.map((group) => group[0].at.toISOString())).toEqual([
      '2026-10-03T14:00:00.000Z',
      '2026-10-03T15:00:00.000Z',
      '2026-10-03T16:00:00.000Z',
      '2026-10-03T17:00:00.000Z',
    ]);
    expect(groups[0].map((sample) => `${sample.lat},${sample.lon}`)).toEqual(
      groups[1].map((sample) => `${sample.lat},${sample.lon}`),
    );
    const anchorSamples = forRouteSamples.mock.calls[0][0] as Array<{
      at: Date;
    }>;
    expect(anchorSamples[0].at.toISOString()).toBe('2026-10-03T15:00:00.000Z');
    const comparison = (
      result as {
        departureComparison: {
          alternatives: Array<{ selected: boolean }>;
        };
      }
    ).departureComparison;
    expect(comparison.alternatives).toHaveLength(4);
    expect(
      comparison.alternatives.filter((alternative) => alternative.selected),
    ).toHaveLength(1);
    expect(JSON.stringify(comparison)).not.toMatch(/score|best|rank/i);
    expect(result.recommendation.engine).toBe('cycling_v1');
  });
});
