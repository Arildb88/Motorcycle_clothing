import { RoutesService } from './routes.service';
import type { RoutingPort } from '../routing';

const waypoints = [
  {
    id: 'w1',
    sortOrder: 0,
    lat: 58.15,
    lon: 8,
    label: 'Home',
    address: null,
    waypointType: 'start',
  },
  {
    id: 'w2',
    sortOrder: 1,
    lat: 58.16,
    lon: 8.05,
    label: 'Café',
    address: null,
    waypointType: 'stop',
  },
  {
    id: 'w3',
    sortOrder: 2,
    lat: 58.17,
    lon: 8.1,
    label: 'Office',
    address: null,
    waypointType: 'end',
  },
];

function serviceWith(port: RoutingPort) {
  const prisma = {
    route: {
      findUnique: jest.fn(async () => ({
        id: 'r1',
        userId: 'u1',
        name: 'Office',
        description: null,
        activityType: 'motorcycle',
        routeKind: 'multi_stop',
        category: null,
        isFavorite: false,
        isDefaultCommute: false,
        startLat: 58.15,
        startLon: 8,
        startLabel: 'Home',
        endLat: 58.17,
        endLon: 8.1,
        endLabel: 'Office',
        waypointsJson: '[]',
        typicalDurationMin: 50,
        preferencesJson:
          '{"avoidMotorways":true,"avoidTolls":false,"avoidFerries":false}',
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        waypoints,
      })),
      update: jest.fn(async () => ({})),
    },
    activityPlan: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
    },
  };
  return new RoutesService(prisma as never, port);
}

describe('RoutesService provider planning', () => {
  it('uses provider road duration instead of the haversine hint', async () => {
    const port: RoutingPort = {
      analyze: jest.fn(async () => ({
        distanceM: 18500,
        durationMin: 22,
        geometry: {
          encoding: 'geojson' as const,
          data: 'should-not-persist',
          points: [
            { lat: 1, lon: 1 },
            { lat: 2, lon: 2 },
            { lat: 3, lon: 3 },
            { lat: 4, lon: 4 },
          ],
        },
        travelSegments: [
          {
            index: 0,
            durationMin: 10,
            expectedSpeedKmh: 40,
            distanceM: 8000,
            start: { lat: 58.15, lon: 8 },
            end: { lat: 58.16, lon: 8.05 },
          },
          {
            index: 1,
            durationMin: 12,
            expectedSpeedKmh: 52.5,
            distanceM: 10500,
            start: { lat: 58.16, lon: 8.05 },
            end: { lat: 58.17, lon: 8.1 },
          },
        ],
        preferencesApplied: { avoidMotorways: true },
        meta: {
          provider: 'ors',
          fromProvider: true,
          fallback: false,
          analyzedAt: '2026-10-01T00:00:00.000Z',
        },
      })),
    };
    const result = await serviceWith(port).planFromRoute('u1', 'r1', {
      planningMode: 'arrival',
      arrivalAt: '2026-09-14T08:00:00.000Z',
      durationMin: 50,
    });
    const plan = result.plan as {
      durationMin: number;
      departureAt: Date;
      arrivalAt: Date;
      routeAnalysisJson: string;
    };
    expect(plan.durationMin).toBe(22);
    expect(plan.arrivalAt.toISOString()).toBe('2026-09-14T08:00:00.000Z');
    expect(plan.departureAt.toISOString()).toBe('2026-09-14T07:38:00.000Z');
    expect(result.analysis?.distanceM).toBe(18500);
    const stored = JSON.parse(plan.routeAnalysisJson);
    expect(stored.geometry).toEqual({
      encoding: 'none',
      data: null,
      points: [
        { lat: 58.15, lon: 8 },
        { lat: 58.16, lon: 8.05 },
        { lat: 58.17, lon: 8.1 },
      ],
    });
    expect(JSON.stringify(stored).includes('should-not-persist')).toBe(false);
  });

  it('keeps the duration hint when the provider is unavailable', async () => {
    const port: RoutingPort = { analyze: async () => null };
    const result = await serviceWith(port).planFromRoute('u1', 'r1', {
      planningMode: 'arrival',
      arrivalAt: '2026-09-14T08:00:00.000Z',
      durationMin: 50,
    });
    const plan = result.plan as { durationMin: number; departureAt: Date };
    expect(plan.durationMin).toBe(50);
    expect(plan.departureAt.toISOString()).toBe('2026-09-14T07:10:00.000Z');
    expect(result.analysis?.meta.fallback).toBe(true);
  });
});
