import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { MVP_ACTIVITY_TYPE } from '../domain';

/**
 * M1 foundation: persist feedback on ActivityLog / ActivityFeedback.
 * Does NOT fully implement M5 learning — only stores evidence and lightly
 * bumps PersonalOffset.n toward future shrinkage (capped).
 */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
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

    // Preliminary evidence bump only (full similarity-weighted M5 later).
    const residual = -overallRating * 0.5;
    const existing = await this.prisma.personalOffset.findUnique({
      where: {
        userId_activityType_zone: {
          userId,
          activityType: MVP_ACTIVITY_TYPE,
          zone: 'overall',
        },
      },
    });
    const prevN = existing?.n ?? 0;
    const prevMean = existing?.meanResidual ?? 0;
    const nextN = prevN + 1;
    const nextMean = (prevMean * prevN + residual) / nextN;
    const cappedMean = Math.max(-3, Math.min(3, nextMean));

    const offset = await this.prisma.personalOffset.upsert({
      where: {
        userId_activityType_zone: {
          userId,
          activityType: MVP_ACTIVITY_TYPE,
          zone: 'overall',
        },
      },
      create: {
        userId,
        activityType: MVP_ACTIVITY_TYPE,
        zone: 'overall',
        n: 1,
        meanResidual: Math.max(-3, Math.min(3, residual)),
      },
      update: {
        n: nextN,
        meanResidual: cappedMean,
      },
    });

    return {
      feedback: log.feedback,
      activityLogId: log.id,
      personalOffset: offset,
      note: 'Stored for M5 learning; spike recommender still speaks in baseline voice',
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
