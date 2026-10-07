import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  appliedThermalBiasC,
  isActivityType,
  isThermalFeedbackZone,
  nextThermalOffset,
  THERMAL_RATINGS,
  type ThermalFeedbackZone,
  type ThermalOffset,
} from '../domain';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

/**
 * Stores cold / comfortable / hot feedback on the existing activity log.
 * Overall feedback updates only that activity's overall PersonalOffset.
 * Optional torso and legs ratings update only those zone offsets.
 * UserProfile.coldSensitivity is left unchanged.
 * Worn kit is stored only when the client sends it.
 */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    if (!isActivityType(dto.activityType)) {
      throw new BadRequestException(
        'activityType must be a known RideWear activity',
      );
    }
    const activityType = dto.activityType;
    const overallRating = this.mapLegacyRating(dto.rating);
    const zoneRatings = this.zoneRatings(dto);
    const routeId = await this.ownedRouteId(userId, dto.routeId);
    const plan = await this.ownedPlan(userId, dto.planId);
    const wornConfiguration = Array.isArray(dto.wornConfiguration)
      ? dto.wornConfiguration
      : [];
    const wornKitRecorded =
      (dto.wornItems?.length ?? 0) > 0 || wornConfiguration.length > 0;
    const recommendation = {
      ...dto.recommendation,
      ...(plan
        ? {
            planId: plan.id,
            commuteGroupId: plan.commuteGroupId,
            commuteLeg: plan.commuteLeg,
          }
        : {}),
      ...(wornConfiguration.length > 0
        ? { recordedWornConfiguration: wornConfiguration }
        : {}),
    };

    const log = await this.prisma.activityLog.create({
      data: {
        userId,
        routeId,
        ...(plan ? { planId: plan.id } : {}),
        startedAt: new Date(dto.departureAt),
        weatherSummaryJson: JSON.stringify(dto.weatherSnapshot),
        recommendationJson: JSON.stringify(recommendation),
        wornGarmentIdsJson: JSON.stringify(dto.wornItems ?? []),
        feedback: {
          create: {
            overallRating,
            notes: dto.notes,
            ...(zoneRatings.length > 0
              ? {
                  bodyAreas: {
                    create: zoneRatings.map((zone) => ({
                      zone: zone.zone,
                      rating: this.mapLegacyRating(zone.rating),
                    })),
                  },
                }
              : {}),
          },
        },
      },
      include: { feedback: { include: { bodyAreas: true } } },
    });

    const existing = await this.prisma.personalOffset.findUnique({
      where: {
        userId_activityType_zone: {
          userId,
          activityType,
          zone: 'overall',
        },
      },
    });
    const next = nextThermalOffset(existing, dto.rating);
    const offset = await this.prisma.personalOffset.upsert({
      where: {
        userId_activityType_zone: {
          userId,
          activityType,
          zone: 'overall',
        },
      },
      create: {
        userId,
        activityType,
        zone: 'overall',
        n: next.n,
        meanResidual: next.meanResidual,
      },
      update: {
        n: next.n,
        meanResidual: next.meanResidual,
      },
    });

    const result = {
      feedback: log.feedback,
      activityLogId: log.id,
      activityType,
      ...(plan ? { planId: plan.id, commuteLeg: plan.commuteLeg } : {}),
      personalOffset: offset,
      appliedBiasC: appliedThermalBiasC(next),
      zones: [] as Array<{
        zone: ThermalFeedbackZone;
        rating: string;
        personalOffset: ThermalOffset;
        appliedBiasC: number;
      }>,
      wornKitRecorded,
      note: 'Stored for this activity only. One event is shrunk by n/(n+k) and does not change coldSensitivity. Overall feedback does not update a body zone. A zone rating updates only that zone.',
    };

    for (const zone of zoneRatings) {
      const current = await this.prisma.personalOffset.findUnique({
        where: {
          userId_activityType_zone: {
            userId,
            activityType,
            zone: zone.zone,
          },
        },
      });
      const updated = nextThermalOffset(current, zone.rating);
      const saved = await this.prisma.personalOffset.upsert({
        where: {
          userId_activityType_zone: {
            userId,
            activityType,
            zone: zone.zone,
          },
        },
        create: {
          userId,
          activityType,
          zone: zone.zone,
          n: updated.n,
          meanResidual: updated.meanResidual,
        },
        update: {
          n: updated.n,
          meanResidual: updated.meanResidual,
        },
      });
      result.zones.push({
        zone: zone.zone,
        rating: zone.rating,
        personalOffset: { n: saved.n, meanResidual: saved.meanResidual },
        appliedBiasC: appliedThermalBiasC(updated),
      });
    }

    return result;
  }

  list(userId: string) {
    return this.prisma.activityFeedback.findMany({
      where: { activityLog: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { activityLog: true, bodyAreas: true },
    });
  }

  private async ownedPlan(userId: string, planId?: string) {
    if (!planId) return null;
    const plan = await this.prisma.activityPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) {
      throw new BadRequestException({
        code: 'PLAN_NOT_OWNED',
        message: 'Plan not found',
      });
    }
    const existing = await this.prisma.activityLog.findUnique({
      where: { planId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'FEEDBACK_ALREADY_RECORDED',
        message: 'Feedback for this leg is already recorded',
      });
    }
    return plan;
  }

  private async ownedRouteId(userId: string, routeId?: string) {
    if (!routeId) return undefined;
    const owned = await this.prisma.route.findFirst({
      where: { id: routeId, userId },
      select: { id: true },
    });
    if (!owned) {
      throw new BadRequestException({
        code: 'ROUTE_NOT_OWNED',
        message: 'Route not found',
      });
    }
    return owned.id;
  }

  private zoneRatings(
    dto: CreateFeedbackDto,
  ): Array<{ zone: ThermalFeedbackZone; rating: string }> {
    const zones = dto.zones;
    if (!zones) return [];
    const ratings: Array<{ zone: ThermalFeedbackZone; rating: string }> = [];
    for (const zone of ['torso', 'legs'] as const) {
      const rating = zones[zone];
      if (rating == null || rating === '') continue;
      if (
        !isThermalFeedbackZone(zone) ||
        !(THERMAL_RATINGS as readonly string[]).includes(rating)
      ) {
        throw new BadRequestException(
          'Zone rating must be too_cold, ok, or too_warm',
        );
      }
      ratings.push({ zone, rating });
    }
    return ratings;
  }

  private mapLegacyRating(rating: string): number {
    switch (rating) {
      case 'too_cold':
        return -2;
      case 'slightly_cold':
        return -1;
      case 'ok':
        return 0;
      case 'slightly_warm':
        return 1;
      case 'too_warm':
        return 2;
      default:
        return 0;
    }
  }
}
