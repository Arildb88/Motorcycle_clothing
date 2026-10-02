import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  appliedThermalBiasC,
  isActivityType,
  nextThermalOffset,
} from '../domain';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

/**
 * Stores cold / comfortable / hot feedback on the existing activity log
 * and updates only that activity's overall PersonalOffset.
 * UserProfile.coldSensitivity is left unchanged.
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

    const log = await this.prisma.activityLog.create({
      data: {
        userId,
        routeId: dto.routeId,
        startedAt: new Date(dto.departureAt),
        weatherSummaryJson: JSON.stringify(dto.weatherSnapshot),
        recommendationJson: JSON.stringify(dto.recommendation),
        wornGarmentIdsJson: JSON.stringify(dto.wornItems ?? []),
        feedback: {
          create: {
            overallRating,
            notes: dto.notes,
          },
        },
      },
      include: { feedback: true },
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

    return {
      feedback: log.feedback,
      activityLogId: log.id,
      activityType,
      personalOffset: offset,
      appliedBiasC: appliedThermalBiasC(next),
      note: 'Stored for this activity only. One event is shrunk by n/(n+k) and does not change coldSensitivity.',
    };
  }

  list(userId: string) {
    return this.prisma.activityFeedback.findMany({
      where: { activityLog: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { activityLog: true, bodyAreas: true },
    });
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
