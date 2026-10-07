import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommutePlanService } from './commute-plan.service';
import { RoutesService } from './routes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NullRoutingAdapter } from '../routing';
import type { RoutingPort, RoutingRequest, RouteAnalysis } from '../routing';
import type { LegForecast, RouteWeatherSummary, WeatherPoint } from '../recommend/weather.types';
import type { ElevationPort } from '../elevation/elevation.port';

type Waypoint = {
  sortOrder: number;
  lat: number;
  lon: number;
  label: string | null;
  address: string | null;
  waypointType: string | null;
};

function point(overrides: Partial<WeatherPoint>): WeatherPoint {
  return {
    lat: 59.9,
    lon: 10.7,
    airTempC: 16,
    precipitationProbPct: 5,
    precipitationMm: 0,
    windSpeedMs: 2,
    ...overrides,
  };
}

function summary(points: WeatherPoint[]): RouteWeatherSummary {
  return {
    provider: 'test',
    sampledAt: '2026-10-07T05:00:00.000Z',
    points,
    minTempC: Math.min(...points.map((item) => item.airTempC)),
    maxTempC: Math.max(...points.map((item) => item.airTempC)),
    maxRainProbPct: Math.max(...points.map((item) => item.precipitationProbPct)),
    maxPrecipMm: Math.max(...points.map((item) => item.precipitationMm)),
    maxWindMs: Math.max(...points.map((item) => item.windSpeedMs)),
  };
}

const dry = summary([point({ airTempC: 18, precipitationMm: 0, precipitationProbPct: 5 })]);
const rain = summary([
  point({
    airTempC: 14,
    precipitationMm: 1.4,
    precipitationProbPct: 80,
    windSpeedMs: 4,
  }),
]);
const cold = summary([point({ airTempC: 0, windSpeedMs: 8, precipitationMm: 0, precipitationProbPct: 5 })]);

const jacket = {
  id: 'jacket',
  name: 'Touring jacket',
  category: 'shell_jacket',
  layer: 'outer',
  primaryBodyZone: 'torso',
  warmthTier: 2,
  windResistTier: 5,
  waterResistTier: 2,
  breathabilityTier: 3,
  material: 'textile',
  hasVentilation: true,
  isHeated: false,
  isDemo: false,
  activityTagsJson: '["motorcycle"]',
  components: [
    {
      id: 'liner',
      kind: 'thermal_liner',
      name: 'Thermal liner',
      warmthDelta: 2,
      windResistDelta: 0,
      waterResistDelta: 0,
      breathabilityDelta: -1,
    },
  ],
};

const pants = {
  id: 'pants',
  name: 'Riding pants',
  category: 'pants',
  layer: 'outer',
  primaryBodyZone: 'legs',
  warmthTier: 2,
  windResistTier: 4,
  waterResistTier: 3,
  breathabilityTier: 3,
  material: 'textile',
  hasVentilation: false,
  isHeated: false,
  isDemo: false,
  activityTagsJson: '["motorcycle"]',
  components: [],
};

const rainSuit = {
  id: 'rain',
  name: 'Rain suit',
  category: 'rain_layer',
  layer: 'outer',
  primaryBodyZone: 'full_body',
  warmthTier: 1,
  windResistTier: 4,
  waterResistTier: 5,
  breathabilityTier: 2,
  material: 'textile',
  hasVentilation: false,
  isHeated: false,
  isDemo: false,
  activityTagsJson: '["motorcycle"]',
  components: [],
};

class ScriptedRouting implements RoutingPort {
  readonly calls: RoutingRequest[] = [];

  async analyze(request: RoutingRequest): Promise<RouteAnalysis> {
    this.calls.push(request);
    const durationMin = request.waypoints[0]?.lat === 59.1 ? 55 : 40;
    const start = request.waypoints[0];
    const end = request.waypoints[request.waypoints.length - 1];
    const dense = Array.from({ length: 40 }, (_, index) => ({
      lat: start.lat,
      lon: start.lon + index * 0.01,
    }));
    return {
      distanceM: 18_000,
      durationMin,
      geometry: { encoding: 'geojson', data: 'dense-line', points: dense },
      travelSegments: [
        {
          index: 0,
          durationMin,
          expectedSpeedKmh: 50,
          distanceM: 18_000,
          start,
          end,
        },
      ],
      preferencesApplied: request.preferences ?? {},
      meta: {
        provider: 'scripted',
        fromProvider: true,
        fallback: false,
        analyzedAt: '2026-10-07T05:00:00.000Z',
      },
    };
  }
}

function harness(options?: {
  returnForecast?: LegForecast;
  category?: string | null;
  activityType?: string;
}) {
  const plans: Array<Record<string, unknown>> = [];
  const routing = new ScriptedRouting();
  const forecastCalls: Array<Array<{ lat: number; lon: number; at?: Date }>> = [];
  let route = commuteRoute(options?.category, options?.activityType);
  const weather = {
    forecastLeg: jest.fn(async (samples: Array<{ lat: number; lon: number; at?: Date }>) => {
      forecastCalls.push(samples);
      const returning = forecastCalls.length % 2 === 0;
      if (returning && options?.returnForecast) return options.returnForecast;
      return {
        available: true as const,
        weather: returning ? rain : dry,
      };
    }),
  };
  const prisma = {
    activityPlan: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `plan-${plans.length + 1}`, ...data };
        plans.push(row);
        return row;
      }),
    },
    userProfile: {
      findUnique: jest.fn(async () => ({
        coldSensitivity: 0,
        sharedWardrobeCategoriesJson: '[]',
      })),
    },
    personalOffset: { findUnique: jest.fn(async () => null) },
    garment: {
      findMany: jest.fn(async () => [jacket, pants, rainSuit]),
    },
    route: { update: jest.fn(async () => route) },
  };
  const routes = {
    get: jest.fn(async (userId: string, id: string) => {
      if (id !== route.id) throw new NotFoundException();
      if (userId !== route.userId) throw new ForbiddenException();
      return {
        ...route,
        waypoints: route.waypoints.map((waypoint) => ({ ...waypoint })),
      };
    }),
    touchLastUsed: jest.fn(async () => undefined),
  };
  const elevations: ElevationPort = {
    groundElevations: async (points) => ({
      provider: 'none',
      attribution: null,
      points: points.map((point) => ({ ...point, elevationM: null })),
    }),
  };
  const service = new CommutePlanService(
    routes as unknown as RoutesService,
    weather as never,
    prisma as unknown as PrismaService,
    elevations,
    routing,
  );
  return {
    service,
    plans,
    routing,
    forecastCalls,
    prisma,
    routes,
    replaceRoute(next: typeof route) {
      route = next;
    },
    readRoute() {
      return route;
    },
  };
}

function commuteRoute(category: string | null = 'commute', activityType = 'motorcycle') {
  const waypoints: Waypoint[] = [
    {
      sortOrder: 0,
      lat: 59.9,
      lon: 10.7,
      label: 'From',
      address: null,
      waypointType: 'start',
    },
    {
      sortOrder: 1,
      lat: 59.4,
      lon: 10.4,
      label: 'Stop',
      address: null,
      waypointType: 'stop',
    },
    {
      sortOrder: 2,
      lat: 59.1,
      lon: 10.2,
      label: 'To',
      address: null,
      waypointType: 'end',
    },
  ];
  return {
    id: 'route-1',
    userId: 'user-1',
    name: 'Weekday ride',
    description: null,
    activityType,
    routeKind: 'multi_stop',
    category,
    typicalDurationMin: 30,
    preferencesJson: '{}',
    startLabel: 'From',
    endLabel: 'To',
    startLat: 59.9,
    startLon: 10.7,
    endLat: 59.1,
    endLon: 10.2,
    waypoints,
  };
}

const day = {
  date: '2026-06-02',
  outboundTime: '07:30',
  returnTime: '16:30',
};

describe('CommutePlanService', () => {
  it('packs rain gear for a dry outbound and rainy return without wearing it outbound', async () => {
    const { service } = harness();
    const result = await service.plan('user-1', 'route-1', day);
    const outbound = result.legs[0];
    const returning = result.legs[1];
    expect(result.differences).toContain('DRY_MORNING_RAIN_RETURN');
    expect(result.preparation.wear.some((item) => item.garmentId === 'rain')).toBe(
      false,
    );
    expect(result.preparation.pack.some((item) => item.garmentId === 'rain')).toBe(
      true,
    );
    expect(
      result.preparation.pack.filter((item) => item.garmentId === 'rain'),
    ).toHaveLength(1);
    expect(outbound.available).toBe(true);
    expect(returning.available).toBe(true);
    expect(outbound.weather?.maxPrecipMm).toBe(0);
    expect(returning.weather?.maxPrecipMm).toBeGreaterThan(0);
  });

  it('keeps the warm outbound kit and adjusts for a colder return', async () => {
    let calls = 0;
    const weather = {
      forecastLeg: jest.fn(async () => {
        calls += 1;
        return { available: true as const, weather: calls % 2 === 0 ? cold : dry };
      }),
    };
    const plans: Array<Record<string, unknown>> = [];
    const prisma = {
      activityPlan: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `plan-${plans.length + 1}`, ...data };
          plans.push(row);
          return row;
        }),
      },
      userProfile: {
        findUnique: async () => ({
          coldSensitivity: 0,
          sharedWardrobeCategoriesJson: '[]',
        }),
      },
      personalOffset: { findUnique: async () => null },
      garment: { findMany: async () => [jacket, pants, rainSuit] },
      route: { update: async () => ({}) },
    };
    const routes = {
      get: async (userId: string) => {
        if (userId !== 'user-1') throw new ForbiddenException();
        return commuteRoute();
      },
      touchLastUsed: async () => undefined,
    };
    const coldService = new CommutePlanService(
      routes as unknown as RoutesService,
      weather as never,
      prisma as unknown as PrismaService,
      {
        groundElevations: async (points) => ({
          provider: 'none',
          attribution: null,
          points: points.map((entry) => ({ ...entry, elevationM: null })),
        }),
      },
      new ScriptedRouting(),
    );
    const result = await coldService.plan('user-1', 'route-1', day);
    const wornShell = result.preparation.wear.find((item) => item.garmentId === 'jacket');
    expect(
      wornShell?.configuration.some((entry) => entry.code === 'INSTALL_THERMAL_LINER'),
    ).toBe(false);
    expect(
      result.preparation.returnAdjustments.some((item) =>
        item.configuration.some((entry) => entry.code === 'INSTALL_THERMAL_LINER'),
      ) ||
        result.legs[1].recommendation?.wear.some((item) =>
          item.configuration.some((entry) => entry.code === 'INSTALL_THERMAL_LINER'),
        ),
    ).toBe(true);
    expect(result.differences).toContain('WARM_OUTBOUND_COLD_RETURN');
    expect(
      result.preparation.wear.filter((item) => item.garmentId === 'jacket'),
    ).toHaveLength(1);
    expect(
      result.preparation.pack.filter((item) => item.garmentId === 'jacket'),
    ).toHaveLength(0);
  });

  it('asks routing and weather for each direction and its own departure', async () => {
    const { service, routing, forecastCalls } = harness();
    const result = await service.plan('user-1', 'route-1', day);
    expect(routing.calls).toHaveLength(2);
    expect(routing.calls[0].waypoints.map((point) => point.lat)).toEqual([
      59.9, 59.4, 59.1,
    ]);
    expect(routing.calls[1].waypoints.map((point) => point.lat)).toEqual([
      59.1, 59.4, 59.9,
    ]);
    expect(routing.calls[0].departAt?.toISOString()).toBe(
      result.legs[0].departureAt,
    );
    expect(routing.calls[1].departAt?.toISOString()).toBe(
      result.legs[1].departureAt,
    );
    expect(routing.calls[0].departAt?.toISOString()).not.toBe(
      routing.calls[1].departAt?.toISOString(),
    );
    expect(result.legs[0].durationMin).toBe(40);
    expect(result.legs[1].durationMin).toBe(55);
    expect(result.legs[0].arrivalAt).not.toBe(result.legs[1].arrivalAt);
    expect(forecastCalls[0][0].lat).toBeCloseTo(59.9);
    expect(forecastCalls[1][0].lat).toBeCloseTo(59.1);
    expect(forecastCalls[0][0].at?.toISOString()).not.toBe(
      forecastCalls[1][0].at?.toISOString(),
    );
    expect(result.legs[0].startLabel).toBe('From');
    expect(result.legs[1].startLabel).toBe('To');
  });

  it('leaves a missing return forecast unavailable and does not copy the morning', async () => {
    const { service, plans } = harness({
      returnForecast: { available: false, reason: 'out_of_range' },
    });
    const result = await service.plan('user-1', 'route-1', day);
    const returning = result.legs[1];
    expect(returning.available).toBe(false);
    expect(returning.unavailableReason).toBe('out_of_range');
    expect(returning.weather).toBeUndefined();
    expect(returning.recommendation).toBeUndefined();
    expect(result.differences).toEqual([]);
    expect(result.preparation.pack.some((item) => item.garmentId === 'rain')).toBe(
      false,
    );
    expect(result.legs[0].weather?.minTempC).toBe(18);
    expect(plans).toHaveLength(2);
    expect(plans[1].commuteLeg).toBe('return');
    expect(plans[0].commuteGroupId).toBe(plans[1].commuteGroupId);
  });

  it('rejects a return that leaves before the outbound arrives and stores nothing', async () => {
    const { service, plans, routing } = harness();
    await expect(
      service.plan('user-1', 'route-1', {
        date: '2026-06-02',
        outboundTime: '07:30',
        returnTime: '07:50',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(plans).toHaveLength(0);
    expect(routing.calls.length).toBeGreaterThan(0);
    await expect(
      service.plan('user-1', 'route-1', {
        date: '2026-03-29',
        outboundTime: '02:30',
        returnTime: '16:00',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'OSLO_TIME_GAP' }),
    });
  });

  it('accepts an overnight return on the next Europe/Oslo day', async () => {
    const { service } = harness();
    const result = await service.plan('user-1', 'route-1', {
      date: '2026-03-28',
      outboundTime: '22:00',
      returnTime: '06:00',
      returnNextDay: true,
    });
    expect(result.legs[0].departureAt).toBe('2026-03-28T21:00:00.000Z');
    expect(result.legs[1].departureAt).toBe('2026-03-29T04:00:00.000Z');
    expect(result.legs[1].civilDate).toBe('2026-03-29');
    expect(result.legs[0].commuteGroupId).toBeUndefined();
    expect(result.commuteGroupId).toBeTruthy();
  });

  it('uses the earlier Oslo instant when the return clock is repeated', async () => {
    const { service } = harness();
    const result = await service.plan('user-1', 'route-1', {
      date: '2026-10-25',
      outboundTime: '01:00',
      returnTime: '02:30',
    });
    expect(result.legs[1].departureAt).toBe('2026-10-25T00:30:00.000Z');
    expect(result.legs[1].ambiguousLocalTime).toBe(true);
    expect(result.legs[1].departureLocal).toBe('02:30');
  });

  it('does not analyze another user or a route that is not a commute', async () => {
    const owned = harness();
    await expect(owned.service.plan('user-2', 'route-1', day)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(owned.plans).toHaveLength(0);

    const ordinary = harness({ category: null });
    await expect(
      ordinary.service.plan('user-1', 'route-1', day),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'COMMUTE_ROUTE_REQUIRED' }),
    });
    expect(ordinary.plans).toHaveLength(0);

    const cycling = harness({ activityType: 'cycling' });
    await expect(
      cycling.service.plan('user-1', 'route-1', day),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'COMMUTE_MOTORCYCLE_ONLY' }),
    });
  });

  it('keeps the plan snapshot after the route changes and drops dense geometry', async () => {
    const { service, plans, readRoute } = harness();
    await service.plan('user-1', 'route-1', day);
    const snapshot = String(plans[0].snapshotJson);
    const analysis = JSON.parse(String(plans[1].routeAnalysisJson));
    readRoute().name = 'Renamed';
    readRoute().waypoints[0].label = 'Changed';
    expect(plans[0].snapshotJson).toBe(snapshot);
    expect(JSON.parse(snapshot).waypoints[0].label).toBe('From');
    expect(JSON.parse(snapshot).name).toBe('Weekday ride');
    expect(analysis.geometry.encoding).toBe('none');
    expect(analysis.geometry.data).toBeNull();
    expect(analysis.geometry.points).toHaveLength(2);
    expect(JSON.stringify(analysis)).not.toContain('dense-line');
  });

  it('still plans an ordinary route as one leg', async () => {
    const plans: Array<Record<string, unknown>> = [];
    const routes: Array<Record<string, unknown>> = [];
    const prisma = {
      route: {
        findUnique: jest.fn(async () => ({
          id: 'plain',
          userId: 'user-1',
          name: 'Sunday',
          description: null,
          activityType: 'motorcycle',
          routeKind: 'point_to_point',
          category: 'weekend',
          isFavorite: false,
          isDefaultCommute: false,
          startLat: 59.9,
          startLon: 10.7,
          startLabel: 'A',
          endLat: 59.1,
          endLon: 10.2,
          endLabel: 'B',
          waypointsJson: '[]',
          typicalDurationMin: 30,
          preferencesJson: '{}',
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          waypoints: [
            {
              sortOrder: 0,
              lat: 59.9,
              lon: 10.7,
              label: 'A',
              address: null,
              waypointType: 'start',
            },
            {
              sortOrder: 1,
              lat: 59.1,
              lon: 10.2,
              label: 'B',
              address: null,
              waypointType: 'end',
            },
          ],
        })),
        update: jest.fn(async () => ({})),
      },
      activityPlan: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          plans.push(data);
          return data;
        }),
      },
    };
    const ordinary = new RoutesService(
      prisma as unknown as PrismaService,
      new NullRoutingAdapter(),
    );
    const planned = await ordinary.planFromRoute('user-1', 'plain', {
      departureAt: '2026-06-02T05:30:00.000Z',
    });
    expect(plans).toHaveLength(1);
    expect(plans[0].commuteGroupId).toBeUndefined();
    expect(planned.plan).toBeTruthy();
    expect(routes).toHaveLength(0);
  });
});
