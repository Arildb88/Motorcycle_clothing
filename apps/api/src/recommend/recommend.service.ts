import { Injectable, NotFoundException } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { WeatherService } from '../weather/weather.service';
import { PrismaService } from '../prisma/prisma.service';
import { recommendClothing, ComfortInput } from './clothing.engine';
import { MVP_ACTIVITY_TYPE } from '../domain';

/**
 * SPIKE SHIM — boolean threshold recommender retained until M3.
 * Uses UserProfile.coldSensitivity + PersonalOffset as a crude bias only.
 * Do not extend this; replace in M3 with demand-based engine.
 */
@Injectable()
export class RecommendService {
  constructor(
    private readonly routes: RoutesService,
    private readonly weather: WeatherService,
    private readonly prisma: PrismaService,
  ) {}

  async forUser(userId: string, routeId?: string) {
    const route = routeId
      ? await this.routes.get(userId, routeId)
      : await this.routes.getDefault(userId);

    if (!route) {
      throw new NotFoundException(
        'No route found. Add a normal commute route first.',
      );
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const offset = await this.prisma.personalOffset.findUnique({
      where: {
        userId_activityType_zone: {
          userId,
          activityType: MVP_ACTIVITY_TYPE,
          zone: 'overall',
        },
      },
    });

    const comfort = this.spikeComfortInput(
      profile?.coldSensitivity ?? 0,
      offset,
    );
    const weather = await this.weather.forRoutePoints([
      { lat: route.startLat, lon: route.startLon },
      { lat: route.endLat, lon: route.endLon },
    ]);

    const recommendation = recommendClothing(weather, comfort);
    const n = offset?.n ?? 0;
    const k = 6;
    const personalWeight = n / (n + k);

    return {
      route: {
        id: route.id,
        name: route.name,
        isDefaultCommute: route.isDefaultCommute,
        startLabel: route.startLabel,
        endLabel: route.endLabel,
        typicalDurationMin: route.typicalDurationMin,
      },
      weather,
      comfort: {
        ...comfort,
        coldSensitivity: profile?.coldSensitivity ?? 0,
        personalSampleCount: n,
        personalWeight,
      },
      recommendation: {
        ...recommendation,
        voice: 'baseline' as const,
        explanationMode:
          'baseline defaults (personalization engine arrives in M3/M5)',
      },
      personalization: {
        voice: 'baseline',
        sampleCount: n,
        shrinkageK: k,
        personalWeight,
        canClaimPersonal: false,
        reason:
          n < 3
            ? 'Insufficient similar-ride evidence for personal claims'
            : 'Spike recommender does not emit personal claims; wait for M3/M5',
      },
    };
  }

  private spikeComfortInput(
    coldSensitivity: number,
    offset: { n: number; meanResidual: number } | null,
  ): ComfortInput {
    const k = 6;
    const n = offset?.n ?? 0;
    const shrunk = n > 0 ? (n / (n + k)) * (offset?.meanResidual ?? 0) : 0;
    const sensitivityBias = -coldSensitivity;
    return {
      glovesBelowC: 10,
      extraJacketLayerBelowC: 12,
      extraPantsLayerBelowC: 8,
      woolBaseBelowC: 5,
      rainProbThreshold: 40,
      windChillSensitivity: 'medium',
      personalColdBiasC: sensitivityBias + shrunk,
    };
  }
}
