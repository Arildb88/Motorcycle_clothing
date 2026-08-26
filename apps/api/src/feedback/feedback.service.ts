import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComfortService } from '../comfort/comfort.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { biasDeltaFromRating } from '../recommend/clothing.engine';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comfort: ComfortService,
  ) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const feedback = await this.prisma.rideFeedback.create({
      data: {
        userId,
        routeId: dto.routeId,
        departureAt: new Date(dto.departureAt),
        weatherSnapshotJson: JSON.stringify(dto.weatherSnapshot),
        recommendationJson: JSON.stringify(dto.recommendation),
        rating: dto.rating,
        wornItemsJson: JSON.stringify(dto.wornItems ?? []),
        notes: dto.notes,
      },
    });

    const delta = biasDeltaFromRating(dto.rating);
    let comfort = null;
    if (delta !== 0) {
      comfort = await this.comfort.applyBiasDelta(userId, delta);
    }

    return { feedback, updatedComfort: comfort, appliedBiasDeltaC: delta };
  }

  list(userId: string) {
    return this.prisma.rideFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
