import { BadRequestException, ConflictException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { THERMAL_FEEDBACK_STEP_C, maxOneEventAppliedC } from '../domain';

describe('FeedbackService thermal ratings', () => {
  function harness(routes: Array<{ id: string; userId: string }> = []) {
    const offsets = new Map<
      string,
      { n: number; meanResidual: number; activityType: string }
    >();
    const profiles: string[] = [];
    const prisma = {
      route: {
        findFirst: jest.fn(
          async ({ where }: { where: { id: string; userId: string } }) =>
            routes.find(
              (route) => route.id === where.id && route.userId === where.userId,
            ) ?? null,
        ),
      },
      activityLog: {
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              routeId?: string;
              feedback: { create: { overallRating: number } };
            };
          }) => ({
            id: 'log-1',
            routeId: data.routeId,
            feedback: {
              id: 'fb-1',
              overallRating: data.feedback.create.overallRating,
            },
          }),
        ),
      },
      personalOffset: {
        findUnique: jest.fn(
          ({
            where,
          }: {
            where: {
              userId_activityType_zone: {
                userId: string;
                activityType: string;
                zone: string;
              };
            };
          }) => {
            const zone = where.userId_activityType_zone;
            return (
              offsets.get(`${zone.userId}:${zone.activityType}:${zone.zone}`) ??
              null
            );
          },
        ),
        upsert: jest.fn(
          ({
            where,
            create,
            update,
          }: {
            where: {
              userId_activityType_zone: {
                userId: string;
                activityType: string;
                zone: string;
              };
            };
            create: { n: number; meanResidual: number; activityType: string };
            update: { n: number; meanResidual: number };
          }) => {
            const zone = where.userId_activityType_zone;
            const id = `${zone.userId}:${zone.activityType}:${zone.zone}`;
            const prev = offsets.get(id);
            const next = prev
              ? {
                  ...prev,
                  n: update.n,
                  meanResidual: update.meanResidual,
                }
              : {
                  n: create.n,
                  meanResidual: create.meanResidual,
                  activityType: create.activityType,
                };
            offsets.set(id, next);
            return next;
          },
        ),
      },
      userProfile: {
        update: jest.fn(() => {
          profiles.push('update');
          throw new Error('coldSensitivity must stay untouched');
        }),
      },
    };
    return {
      service: new FeedbackService(prisma as never),
      offsets,
      prisma,
      profiles,
    };
  }

  const body = {
    departureAt: '2026-10-02T12:00:00.000Z',
    weatherSnapshot: { minTempC: 4 },
    recommendation: { engine: 'cycling_v1' },
  };

  it('stores cold, comfortable, and hot on the activity that sent them', async () => {
    const { service, offsets, profiles } = harness();

    const cold = await service.create('user-1', {
      ...body,
      activityType: 'cycling',
      rating: 'too_cold',
    });
    expect(cold.activityType).toBe('cycling');
    expect(cold.feedback?.overallRating).toBe(-2);
    expect(cold.appliedBiasC).toBeCloseTo(maxOneEventAppliedC(), 10);
    expect(Math.abs(cold.appliedBiasC)).toBeLessThan(THERMAL_FEEDBACK_STEP_C);

    const comfortable = await service.create('user-1', {
      ...body,
      activityType: 'cycling',
      rating: 'ok',
    });
    expect(comfortable.appliedBiasC).toBeLessThan(cold.appliedBiasC);
    expect(comfortable.appliedBiasC).toBeGreaterThan(0);

    const hot = await service.create('user-1', {
      ...body,
      activityType: 'alpine_skiing',
      rating: 'too_warm',
    });
    expect(hot.activityType).toBe('alpine_skiing');
    expect(hot.feedback?.overallRating).toBe(2);
    expect(hot.appliedBiasC).toBeCloseTo(-maxOneEventAppliedC(), 10);

    expect(offsets.get('user-1:cycling:overall')?.meanResidual).toBeGreaterThan(
      0,
    );
    expect(offsets.get('user-1:alpine_skiing:overall')?.meanResidual).toBe(
      -THERMAL_FEEDBACK_STEP_C,
    );
    expect(offsets.has('user-1:motorcycle:overall')).toBe(false);
    expect(offsets.has('user-1:snowboarding:overall')).toBe(false);
    expect(offsets.has('user-1:cycling:torso')).toBe(false);
    expect(offsets.has('user-1:cycling:legs')).toBe(false);
    expect(profiles).toEqual([]);
  });

  it('stores a route only when that route belongs to the same user', async () => {
    const owned = harness([{ id: 'route-a', userId: 'user-1' }]);
    const saved = await owned.service.create('user-1', {
      ...body,
      activityType: 'cycling',
      rating: 'ok',
      routeId: 'route-a',
    });
    expect(saved.activityLogId).toBe('log-1');
    expect(owned.prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ routeId: 'route-a', userId: 'user-1' }),
      }),
    );

    const foreign = harness([{ id: 'route-b', userId: 'user-2' }]);
    await expect(
      foreign.service.create('user-1', {
        ...body,
        activityType: 'cycling',
        rating: 'too_cold',
        routeId: 'route-b',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ROUTE_NOT_OWNED' }),
    });
    expect(foreign.prisma.activityLog.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown activity instead of writing a motorcycle offset', async () => {
    const { service, offsets } = harness();
    await expect(
      service.create('user-1', {
        ...body,
        activityType: 'surfing',
        rating: 'too_cold',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(offsets.size).toBe(0);
  });

  it('records each commute leg once and does not apply the same plan again', async () => {
    const plans = [
      {
        id: 'out',
        userId: 'user-1',
        commuteGroupId: 'group-1',
        commuteLeg: 'outbound',
      },
      {
        id: 'back',
        userId: 'user-1',
        commuteGroupId: 'group-1',
        commuteLeg: 'return',
      },
    ];
    const logs = new Map<string, string>();
    let offsetWrites = 0;
    const prisma = {
      route: { findFirst: async () => null },
      activityPlan: {
        findFirst: async ({
          where,
        }: {
          where: { id: string; userId: string };
        }) =>
          plans.find(
            (plan) => plan.id === where.id && plan.userId === where.userId,
          ) ?? null,
      },
      activityLog: {
        findUnique: async ({ where }: { where: { planId: string } }) =>
          logs.has(where.planId) ? { id: logs.get(where.planId) } : null,
        create: async ({ data }: { data: { planId?: string } }) => {
          const id = `log-${logs.size + 1}`;
          if (data.planId) logs.set(data.planId, id);
          return {
            id,
            feedback: { id: `fb-${id}`, overallRating: 0 },
          };
        },
      },
      personalOffset: {
        findUnique: async () =>
          offsetWrites === 0
            ? null
            : { n: offsetWrites, meanResidual: offsetWrites },
        upsert: async () => {
          offsetWrites += 1;
          return { n: offsetWrites, meanResidual: offsetWrites };
        },
      },
      userProfile: { update: async () => undefined },
    };
    const service = new FeedbackService(prisma as never);
    const outbound = await service.create('user-1', {
      ...body,
      activityType: 'motorcycle',
      rating: 'ok',
      planId: 'out',
    });
    const returning = await service.create('user-1', {
      ...body,
      activityType: 'motorcycle',
      rating: 'too_cold',
      planId: 'back',
    });
    expect(outbound.commuteLeg).toBe('outbound');
    expect(returning.commuteLeg).toBe('return');
    expect(offsetWrites).toBe(2);
    await expect(
      service.create('user-1', {
        ...body,
        activityType: 'motorcycle',
        rating: 'too_warm',
        planId: 'out',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(offsetWrites).toBe(2);
    expect(logs.size).toBe(2);
  });

  it('learns torso and legs separately and leaves the other zone unchanged', async () => {
    const { service, offsets } = harness();
    const saved = await service.create('user-1', {
      ...body,
      activityType: 'cycling',
      rating: 'ok',
      zones: { torso: 'too_cold' },
    });

    expect(saved.zones).toEqual([
      expect.objectContaining({
        zone: 'torso',
        rating: 'too_cold',
      }),
    ]);
    expect(saved.appliedBiasC).toBe(0);
    expect(offsets.get('user-1:cycling:overall')).toEqual({
      n: 1,
      meanResidual: 0,
      activityType: 'cycling',
    });
    expect(offsets.get('user-1:cycling:torso')?.meanResidual).toBe(
      THERMAL_FEEDBACK_STEP_C,
    );
    expect(offsets.get('user-1:cycling:torso')?.n).toBe(1);
    expect(offsets.has('user-1:cycling:legs')).toBe(false);
    expect(offsets.has('user-1:motorcycle:torso')).toBe(false);

    const legs = await service.create('user-1', {
      ...body,
      activityType: 'xc_skiing',
      rating: 'too_warm',
      zones: { legs: 'too_cold', torso: 'too_warm' },
    });
    expect(legs.zones.map((zone) => zone.zone)).toEqual(['torso', 'legs']);
    expect(offsets.get('user-1:xc_skiing:legs')?.meanResidual).toBe(
      THERMAL_FEEDBACK_STEP_C,
    );
    expect(offsets.get('user-1:xc_skiing:torso')?.meanResidual).toBe(
      -THERMAL_FEEDBACK_STEP_C,
    );
    expect(offsets.get('user-1:xc_skiing:overall')?.meanResidual).toBe(
      -THERMAL_FEEDBACK_STEP_C,
    );
    expect(offsets.get('user-1:cycling:torso')?.n).toBe(1);
    expect(offsets.has('user-1:cycling:legs')).toBe(false);
  });

  it('does not apply one event to both overall and a zone, or twice on retry', async () => {
    const plans = [
      {
        id: 'out',
        userId: 'user-1',
        commuteGroupId: 'group-1',
        commuteLeg: 'outbound',
      },
    ];
    const logs = new Map<string, string>();
    const offsets = new Map<string, { n: number }>();
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      route: { findFirst: async () => null },
      activityPlan: {
        findFirst: async ({
          where,
        }: {
          where: { id: string; userId: string };
        }) =>
          plans.find(
            (plan) => plan.id === where.id && plan.userId === where.userId,
          ) ?? null,
      },
      activityLog: {
        findUnique: async ({ where }: { where: { planId: string } }) =>
          logs.has(where.planId) ? { id: logs.get(where.planId) } : null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          const id = 'log-out';
          logs.set('out', id);
          return {
            id,
            feedback: { id: 'fb-1', overallRating: -2, bodyAreas: [] },
          };
        },
      },
      personalOffset: {
        findUnique: async ({
          where,
        }: {
          where: { userId_activityType_zone: { zone: string } };
        }) => offsets.get(where.userId_activityType_zone.zone) ?? null,
        upsert: async ({
          where,
          create,
        }: {
          where: { userId_activityType_zone: { zone: string } };
          create: { n: number; meanResidual: number };
        }) => {
          const zone = where.userId_activityType_zone.zone;
          const prev = offsets.get(zone);
          const next = {
            n: prev ? prev.n + 1 : create.n,
            meanResidual: create.meanResidual,
          };
          offsets.set(zone, next);
          return next;
        },
      },
    };
    const service = new FeedbackService(prisma as never);
    const first = await service.create('user-1', {
      ...body,
      activityType: 'motorcycle',
      rating: 'too_cold',
      planId: 'out',
      zones: { torso: 'too_cold', legs: 'ok' },
      recommendation: {
        engine: 'motorcycle_v1',
        wear: [{ garmentId: 'recommended-jacket', slot: 'shell' }],
      },
    });
    expect(first.commuteLeg).toBe('outbound');
    expect(first.wornKitRecorded).toBe(false);
    expect(offsets.get('overall')?.n).toBe(1);
    expect(offsets.get('torso')?.n).toBe(1);
    expect(offsets.get('legs')?.n).toBe(1);
    expect(created[0]?.wornGarmentIdsJson).toBe('[]');
    const stored = JSON.parse(String(created[0]?.recommendationJson));
    expect(stored.wear[0].garmentId).toBe('recommended-jacket');
    expect(stored.recordedWornConfiguration).toBeUndefined();
    expect(stored.commuteLeg).toBe('outbound');

    await expect(
      service.create('user-1', {
        ...body,
        activityType: 'motorcycle',
        rating: 'too_cold',
        planId: 'out',
        zones: { torso: 'too_cold' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(offsets.get('overall')?.n).toBe(1);
    expect(offsets.get('torso')?.n).toBe(1);
    expect(created).toHaveLength(1);
  });

  it('records worn kit only when the rider sent it', async () => {
    const created: Array<Record<string, unknown>> = [];
    const { service, prisma } = harness();
    prisma.activityLog.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return {
          id: 'log-worn',
          feedback: { id: 'fb-worn', overallRating: 0, bodyAreas: [] },
        };
      },
    );
    const saved = await service.create('user-1', {
      ...body,
      activityType: 'alpine_skiing',
      rating: 'ok',
      zones: { legs: 'too_warm' },
      wornItems: ['own-pants'],
      wornConfiguration: [
        { garmentId: 'own-pants', configuration: ['VENTS_CLOSED'] },
      ],
      recommendation: { wear: [{ garmentId: 'recommended-pants' }] },
    });
    expect(saved.wornKitRecorded).toBe(true);
    expect(created[0]?.wornGarmentIdsJson).toBe(JSON.stringify(['own-pants']));
    const stored = JSON.parse(String(created[0]?.recommendationJson));
    expect(stored.recordedWornConfiguration).toEqual([
      { garmentId: 'own-pants', configuration: ['VENTS_CLOSED'] },
    ]);
    expect(stored.wear[0].garmentId).toBe('recommended-pants');
  });

  it('rejects a zone rating outside cold, comfortable, and hot', async () => {
    const { service, offsets } = harness();
    await expect(
      service.create('user-1', {
        ...body,
        activityType: 'cycling',
        rating: 'ok',
        zones: { torso: 'slightly_cold' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(offsets.size).toBe(0);
  });
});
