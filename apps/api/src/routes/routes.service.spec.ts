import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { PrismaService } from '../prisma/prisma.service';

type Wp = {
  id: string;
  routeId: string;
  sortOrder: number;
  lat: number;
  lon: number;
  label: string | null;
  address: string | null;
  waypointType: string | null;
  createdAt: Date;
};

type RouteRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  activityType: string;
  routeKind: string;
  category: string | null;
  isFavorite: boolean;
  isDefaultCommute: boolean;
  startLat: number;
  startLon: number;
  startLabel: string | null;
  endLat: number;
  endLon: number;
  endLabel: string | null;
  waypointsJson: string;
  typicalDurationMin: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  waypoints: Wp[];
};

describe('RoutesService', () => {
  let service: RoutesService;
  const routes: RouteRow[] = [];
  const waypoints: Wp[] = [];
  const plans: Record<string, unknown>[] = [];
  let idSeq = 0;
  const nextId = (p: string) => `${p}_${++idSeq}`;

  const prismaMock = {
    route: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
        routes
          .filter((r) => r.userId === where.userId)
          .map((r) => ({
            ...r,
            waypoints: waypoints
              .filter((w) => w.routeId === r.id)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          }))
          .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite)),
      ),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const r = routes.find((x) => x.id === where.id);
        if (!r) return null;
        return {
          ...r,
          waypoints: waypoints
            .filter((w) => w.routeId === r.id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        };
      }),
      findFirst: jest.fn(
        async ({ where }: { where: { userId: string; isDefaultCommute?: boolean } }) => {
          const r = routes.find(
            (x) =>
              x.userId === where.userId &&
              (where.isDefaultCommute === undefined ||
                x.isDefaultCommute === where.isDefaultCommute),
          );
          if (!r) return null;
          return {
            ...r,
            waypoints: waypoints
              .filter((w) => w.routeId === r.id)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          };
        },
      ),
      count: jest.fn(async ({ where }: { where: { userId: string } }) =>
        routes.filter((r) => r.userId === where.userId).length,
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Record<string, unknown> & {
            waypoints?: { create: Array<Record<string, unknown>> };
          };
        }) => {
          const id = nextId('r');
          const now = new Date();
          const row: RouteRow = {
            id,
            userId: data.userId as string,
            name: data.name as string,
            description: (data.description as string | null) ?? null,
            activityType: (data.activityType as string) ?? 'motorcycle',
            routeKind: (data.routeKind as string) ?? 'point_to_point',
            category: (data.category as string | null) ?? null,
            isFavorite: Boolean(data.isFavorite),
            isDefaultCommute: Boolean(data.isDefaultCommute),
            startLat: data.startLat as number,
            startLon: data.startLon as number,
            startLabel: (data.startLabel as string | null) ?? null,
            endLat: data.endLat as number,
            endLon: data.endLon as number,
            endLabel: (data.endLabel as string | null) ?? null,
            waypointsJson: (data.waypointsJson as string) ?? '[]',
            typicalDurationMin: (data.typicalDurationMin as number) ?? 30,
            lastUsedAt: null,
            createdAt: now,
            updatedAt: now,
            waypoints: [],
          };
          routes.push(row);
          const creates = data.waypoints?.create ?? [];
          for (const c of creates) {
            const wp: Wp = {
              id: nextId('w'),
              routeId: id,
              sortOrder: c.sortOrder as number,
              lat: c.lat as number,
              lon: c.lon as number,
              label: (c.label as string | null) ?? null,
              address: (c.address as string | null) ?? null,
              waypointType: (c.waypointType as string | null) ?? null,
              createdAt: now,
            };
            waypoints.push(wp);
            row.waypoints.push(wp);
          }
          return {
            ...row,
            waypoints: [...row.waypoints].sort(
              (a, b) => a.sortOrder - b.sortOrder,
            ),
          };
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const idx = routes.findIndex((r) => r.id === where.id);
          routes[idx] = {
            ...routes[idx],
            ...Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== undefined),
            ),
            updatedAt: new Date(),
          } as RouteRow;
          return {
            ...routes[idx],
            waypoints: waypoints
              .filter((w) => w.routeId === where.id)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          };
        },
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { userId: string; isDefaultCommute?: boolean };
          data: Record<string, unknown>;
        }) => {
          for (const r of routes) {
            if (
              r.userId === where.userId &&
              (where.isDefaultCommute === undefined ||
                r.isDefaultCommute === where.isDefaultCommute)
            ) {
              Object.assign(r, data);
            }
          }
          return { count: 0 };
        },
      ),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const idx = routes.findIndex((r) => r.id === where.id);
        const [removed] = routes.splice(idx, 1);
        for (let i = waypoints.length - 1; i >= 0; i--) {
          if (waypoints[i].routeId === where.id) waypoints.splice(i, 1);
        }
        return removed;
      }),
    },
    routeWaypoint: {
      deleteMany: jest.fn(async ({ where }: { where: { routeId: string } }) => {
        for (let i = waypoints.length - 1; i >= 0; i--) {
          if (waypoints[i].routeId === where.routeId) waypoints.splice(i, 1);
        }
        return { count: 0 };
      }),
      createMany: jest.fn(
        async ({ data }: { data: Array<Record<string, unknown>> }) => {
          for (const c of data) {
            waypoints.push({
              id: nextId('w'),
              routeId: c.routeId as string,
              sortOrder: c.sortOrder as number,
              lat: c.lat as number,
              lon: c.lon as number,
              label: (c.label as string | null) ?? null,
              address: (c.address as string | null) ?? null,
              waypointType: (c.waypointType as string | null) ?? null,
              createdAt: new Date(),
            });
          }
          return { count: data.length };
        },
      ),
    },
    activityPlan: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const plan = { id: nextId('p'), ...data, createdAt: new Date() };
        plans.push(plan);
        return plan;
      }),
    },
    userProfile: {
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    ),
  };

  beforeEach(async () => {
    routes.length = 0;
    waypoints.length = 0;
    plans.length = 0;
    idSeq = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(RoutesService);
  });

  it('creates a point-to-point route from waypoints', async () => {
    const r = await service.create('u1', {
      name: 'Work 1',
      category: 'work',
      waypoints: [
        { lat: 58.15, lon: 8.0, label: 'Home' },
        { lat: 58.16, lon: 8.01, label: 'Work' },
      ],
    });
    expect(r.routeKind).toBe('point_to_point');
    expect(r.waypoints).toHaveLength(2);
    expect(r.startLabel).toBe('Home');
    expect(r.endLabel).toBe('Work');
    expect(r.isDefaultCommute).toBe(true);
  });

  it('creates a multi-stop route', async () => {
    const r = await service.create('u1', {
      name: 'Hovden trip',
      category: 'touring',
      waypoints: [
        { lat: 58.15, lon: 8.0, label: 'Home' },
        { lat: 58.6, lon: 7.8, label: 'Evje' },
        { lat: 59.1, lon: 7.5, label: 'Valle' },
        { lat: 59.55, lon: 7.35, label: 'Hovden' },
      ],
    });
    expect(r.routeKind).toBe('multi_stop');
    expect(r.waypoints.map((w) => w.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('detects a loop when end is near start', async () => {
    const r = await service.create('u1', {
      name: 'Sunday Loop',
      waypoints: [
        { lat: 58.15, lon: 8.0, label: 'Home' },
        { lat: 58.1, lon: 8.2, label: 'Coast' },
        { lat: 58.2, lon: 8.1, label: 'Café' },
        { lat: 58.15001, lon: 8.00001, label: 'Home' },
      ],
    });
    expect(r.routeKind).toBe('loop');
  });

  it('rejects invalid coordinates', async () => {
    await expect(
      service.create('u1', {
        name: 'Bad',
        waypoints: [
          { lat: 999, lon: 8 },
          { lat: 58, lon: 8 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects fewer than 2 waypoints', async () => {
    await expect(
      service.create('u1', {
        name: 'Solo',
        waypoints: [{ lat: 58, lon: 8, label: 'Only' }],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces ownership on get/update/delete', async () => {
    const r = await service.create('u1', {
      name: 'Mine',
      startLat: 58,
      startLon: 8,
      endLat: 59,
      endLon: 9,
    });
    await expect(service.get('u2', r.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.update('u2', r.id, { name: 'Hacked' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('u2', r.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns 404 for missing route', async () => {
    await expect(service.get('u1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates name, favorite, and reorders waypoints', async () => {
    const r = await service.create('u1', {
      name: 'Work 2',
      waypoints: [
        { lat: 58.1, lon: 8.0, label: 'A' },
        { lat: 58.2, lon: 8.1, label: 'B' },
      ],
    });
    const updated = await service.update('u1', r.id, {
      name: 'Evening ride',
      isFavorite: true,
      waypoints: [
        { lat: 58.2, lon: 8.1, label: 'B' },
        { lat: 58.3, lon: 8.2, label: 'C' },
        { lat: 58.1, lon: 8.0, label: 'A' },
      ],
    });
    expect(updated.name).toBe('Evening ride');
    expect(updated.isFavorite).toBe(true);
    expect(updated.waypoints.map((w) => w.label)).toEqual(['B', 'C', 'A']);
    expect(updated.routeKind).toBe('multi_stop');
  });

  it('deletes route without throwing; history plans keep snapshot', async () => {
    const r = await service.create('u1', {
      name: 'Work 1',
      waypoints: [
        { lat: 58.15, lon: 8.0, label: 'Home' },
        { lat: 58.16, lon: 8.01, label: 'Work' },
      ],
    });
    const planned = await service.planFromRoute('u1', r.id, {});
    const snapshot = JSON.parse(
      (planned.plan as { snapshotJson: string }).snapshotJson,
    );
    expect(snapshot.savedRouteId).toBe(r.id);
    expect(snapshot.waypoints).toHaveLength(2);

    await service.remove('u1', r.id);
    expect(plans).toHaveLength(1);
    expect(snapshot.name).toBe('Work 1');
  });

  it('lists favorites first', async () => {
    await service.create('u1', {
      name: 'Zulu',
      waypoints: [
        { lat: 58, lon: 8 },
        { lat: 59, lon: 9 },
      ],
    });
    await service.create('u1', {
      name: 'Alpha',
      isFavorite: true,
      waypoints: [
        { lat: 57, lon: 7 },
        { lat: 56, lon: 6 },
      ],
    });
    const list = await service.list('u1');
    expect(list[0].name).toBe('Alpha');
    expect(list[0].isFavorite).toBe(true);
  });

  it('plans from route with custom departure', async () => {
    const r = await service.create('u1', {
      name: 'University',
      typicalDurationMin: 40,
      waypoints: [
        { lat: 58.15, lon: 8.0, label: 'Home' },
        { lat: 58.17, lon: 8.02, label: 'Campus' },
      ],
    });
    const result = await service.planFromRoute('u1', r.id, {
      departureAt: '2026-09-11T07:30:00.000Z',
      durationMin: 45,
    });
    expect((result.plan as { durationMin: number }).durationMin).toBe(45);
    expect(
      ((result.plan as { departureAt: Date }).departureAt as Date).toISOString(),
    ).toBe('2026-09-11T07:30:00.000Z');
  });
});
