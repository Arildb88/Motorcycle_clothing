import { BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { THERMAL_FEEDBACK_STEP_C, maxOneEventAppliedC } from '../domain';

describe('FeedbackService thermal ratings', () => {
  function harness() {
    const offsets = new Map<
      string,
      { n: number; meanResidual: number; activityType: string }
    >();
    const profiles: string[] = [];
    const prisma = {
      activityLog: {
        create: jest.fn(
          ({
            data,
          }: {
            data: { feedback: { create: { overallRating: number } } };
          }) => ({
            id: 'log-1',
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
              };
            };
          }) => {
            const zone = where.userId_activityType_zone;
            return offsets.get(`${zone.userId}:${zone.activityType}`) ?? null;
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
              };
            };
            create: { n: number; meanResidual: number; activityType: string };
            update: { n: number; meanResidual: number };
          }) => {
            const zone = where.userId_activityType_zone;
            const id = `${zone.userId}:${zone.activityType}`;
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

    expect(offsets.get('user-1:cycling')?.meanResidual).toBeGreaterThan(0);
    expect(offsets.get('user-1:alpine_skiing')?.meanResidual).toBe(
      -THERMAL_FEEDBACK_STEP_C,
    );
    expect(offsets.has('user-1:motorcycle')).toBe(false);
    expect(offsets.has('user-1:snowboarding')).toBe(false);
    expect(profiles).toEqual([]);
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
});
