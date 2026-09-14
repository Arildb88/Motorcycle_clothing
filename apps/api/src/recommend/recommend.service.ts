import { Injectable, NotFoundException } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { WeatherService } from '../weather/weather.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  isPlanningMode,
  MVP_ACTIVITY_TYPE,
  parseRoutePreferences,
  type PlanningMode,
} from '../domain';
import { NullRoutingAdapter } from '../routing';
import {
  MOTORCYCLE_EXPOSURE,
  runMotorcycleRecommendationPipeline,
  type GarmentInput,
  type KitItem,
  type Reason,
  type ReasonCode,
  type RouteTravelSegment,
} from './motorcycle';
import { analyzeRideAt } from './route-weather';
import type { RouteWeatherTimelineSummaryV1 } from './route-weather';

export type RecommendOptions = {
  departureAt?: string;
  arrivalAt?: string;
  planningMode?: string;
};

/**
 * Motorcycle Recommendation Engine v1 (M3) + route weather timeline v1.
 *
 * Always recalculates weather for the selected route — never reads a
 * stored recommendation from Route.
 *
 * Flow: route analysis → time-aware weather timeline → motorcycle pipeline.
 * Find My Best Time must reuse analyzeRideAt — not a separate engine.
 *
 * Personalization: shrinkage `n/(n+k)` bias only; no M5 learning claims.
 */
@Injectable()
export class RecommendService {
  private readonly routing = new NullRoutingAdapter();

  constructor(
    private readonly routes: RoutesService,
    private readonly weather: WeatherService,
    private readonly prisma: PrismaService,
  ) {}

  async forUser(
    userId: string,
    routeId?: string,
    options?: RecommendOptions | string,
  ) {
    // Back-compat: third arg may still be a departureAt ISO string.
    const opts: RecommendOptions =
      typeof options === 'string'
        ? { departureAt: options }
        : (options ?? {});

    const route = routeId
      ? await this.routes.get(userId, routeId)
      : await this.routes.getDefault(userId);

    if (!route) {
      throw new NotFoundException(
        'No route found. Save a motorcycle route first.',
      );
    }

    if (routeId) {
      await this.routes.touchLastUsed(userId, route.id);
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

    const n = offset?.n ?? 0;
    const k = MOTORCYCLE_EXPOSURE.personalShrinkageK;
    const personalWeight = n / (n + k);
    const shrunk =
      n > 0 ? personalWeight * (offset?.meanResidual ?? 0) : 0;
    const personalColdBiasC = -(profile?.coldSensitivity ?? 0) + shrunk;

    const planningMode: PlanningMode = isPlanningMode(opts.planningMode)
      ? opts.planningMode
      : 'departure';

    const durationMin = route.typicalDurationMin ?? 30;
    const waypoints =
      route.waypoints && route.waypoints.length >= 2
        ? route.waypoints.map((w) => ({ lat: w.lat, lon: w.lon }))
        : this.routes.weatherPointsFor(route);

    const preferences = parseRoutePreferences(
      (route as { preferencesJson?: string }).preferencesJson,
    );

    const anchorAt =
      planningMode === 'arrival'
        ? opts.arrivalAt
          ? new Date(opts.arrivalAt)
          : new Date()
        : opts.departureAt
          ? new Date(opts.departureAt)
          : new Date();

    const analysis = await this.routing.analyze({
      waypoints:
        waypoints.length >= 2
          ? waypoints
          : [
              { lat: route.startLat, lon: route.startLon },
              { lat: route.endLat, lon: route.endLon },
            ],
      preferences,
      departAt: planningMode === 'departure' ? anchorAt : null,
      durationMin,
      travelProfile: 'motorcycle',
    });

    const garments = await this.prisma.garment.findMany({
      where: { userId },
      include: { components: true },
    });
    const wardrobe = garments.map((g) => this.toGarmentInput(g));

    let weather = await this.weather.forRoutePoints(
      this.routes.weatherPointsFor(route),
    );
    let routeTravelSegments: RouteTravelSegment[] | undefined;
    let weatherTimelineSummary: RouteWeatherTimelineSummaryV1 | null = null;
    let timelineReasons: Reason[] = [];
    let effectiveDepartureAt =
      opts.departureAt ?? new Date().toISOString();
    let effectiveArrivalAt: string | null = null;

    if (analysis) {
      const analyzed = await analyzeRideAt({
        analysis,
        weatherPort: this.weather,
        planningMode,
        anchorAt,
      });
      weather = analyzed.pipeline.weather;
      routeTravelSegments = analyzed.pipeline.routeTravelSegments;
      weatherTimelineSummary = analyzed.summary;
      timelineReasons = this.mapTimelineReasons(
        analyzed.timeline.meta.reasonCodes,
      );
      effectiveDepartureAt = analyzed.timeline.departureAt;
      effectiveArrivalAt = analyzed.timeline.arrivalAt;
    }

    const engine = runMotorcycleRecommendationPipeline({
      weather,
      wardrobe,
      rideDurationMin: durationMin,
      cruiseKmh: null,
      routeTravelSegments,
      personalColdBiasC,
      personalSampleCount: n,
      shrinkageK: k,
    });

    const canClaimPersonal = false;

    const mergedReasons = this.mergeReasons([
      ...timelineReasons,
      ...engine.reasons,
    ]);

    const items = [
      ...engine.wear.map((i) => this.kitLabel(i)),
      ...engine.pack.map((i) => `Pack: ${this.kitLabel(i)}`),
    ];
    const reasonCodes = mergedReasons.map((r) => r.code);

    return {
      route: {
        id: route.id,
        name: route.name,
        description: route.description,
        activityType: route.activityType,
        routeKind: route.routeKind,
        category: route.category,
        isFavorite: route.isFavorite,
        isDefaultCommute: route.isDefaultCommute,
        startLabel: route.startLabel,
        endLabel: route.endLabel,
        typicalDurationMin: route.typicalDurationMin,
        waypoints: route.waypoints?.map((w) => ({
          sortOrder: w.sortOrder,
          lat: w.lat,
          lon: w.lon,
          label: w.label,
        })),
      },
      departureAt: effectiveDepartureAt,
      arrivalAt: effectiveArrivalAt,
      planningMode,
      weather,
      weatherTimeline: weatherTimelineSummary,
      comfort: {
        coldSensitivity: profile?.coldSensitivity ?? 0,
        personalSampleCount: n,
        personalWeight,
        personalColdBiasC,
      },
      recommendation: {
        engine: engine.engine,
        effectiveTempC: engine.exposure.motorcycleExposureSustainedC,
        exposure: engine.exposure,
        demand: {
          sustainedWarmth: engine.demand.sustainedWarmth,
          peakWarmth: engine.demand.peakWarmth,
          shortExtremeWarmth: engine.demand.shortExtremeWarmth,
          shortExtremeInfluencesPackOnly:
            engine.demand.shortExtremeInfluencesPackOnly,
          sustained: engine.demand.sustained,
          peak: engine.demand.peak,
        },
        wear: engine.wear,
        pack: engine.pack,
        reasons: mergedReasons,
        confidence: engine.confidence,
        items,
        reasonCodes,
        voice: 'baseline' as const,
      },
      personalization: {
        voice: 'baseline' as const,
        sampleCount: n,
        shrinkageK: k,
        personalWeight,
        canClaimPersonal,
        reason:
          n < MOTORCYCLE_EXPOSURE.personalClaimMinN
            ? 'Insufficient similar-ride evidence for personal claims'
            : 'M3 baseline engine; personal preference claims arrive in M5',
      },
    };
  }

  private mapTimelineReasons(codes: string[]): Reason[] {
    const allowed = new Set<string>([
      'ROUTE_WEATHER_TIMELINE_USED',
      'ROUTE_WEATHER_PARTIAL',
      'WEATHER_TIME_INTERPOLATED',
      'ROUTE_TIMING_FALLBACK_USED',
      'WIND_DIRECTION_UNAVAILABLE',
    ]);
    return codes
      .filter((c) => allowed.has(c))
      .map((code) => ({ code: code as ReasonCode }));
  }

  private mergeReasons(reasons: Reason[]): Reason[] {
    const seen = new Set<string>();
    const out: Reason[] = [];
    for (const r of reasons) {
      if (seen.has(r.code)) continue;
      seen.add(r.code);
      out.push(r);
    }
    return out;
  }

  private kitLabel(item: KitItem): string {
    if (item.source === 'wardrobe' && item.garmentName) {
      const configs = item.configuration
        .map((c) => c.code.toLowerCase().replace(/_/g, ' '))
        .join(', ');
      return configs
        ? `${item.garmentName} (${configs})`
        : item.garmentName;
    }
    return item.genericLabel ?? item.slot;
  }

  private toGarmentInput(g: {
    id: string;
    name: string;
    category: string;
    layer: string;
    primaryBodyZone: string;
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
    material: string | null;
    hasVentilation: boolean;
    isHeated: boolean;
    activityTagsJson: string;
    components: Array<{
      id: string;
      kind: string;
      name: string | null;
      warmthDelta: number;
      windResistDelta: number;
      waterResistDelta: number;
      breathabilityDelta: number;
    }>;
  }): GarmentInput {
    let activityTags: string[] = [MVP_ACTIVITY_TYPE];
    try {
      const parsed = JSON.parse(g.activityTagsJson);
      if (Array.isArray(parsed)) activityTags = parsed.map(String);
    } catch {
      /* keep default */
    }
    return {
      id: g.id,
      name: g.name,
      category: g.category,
      layer: g.layer,
      primaryBodyZone: g.primaryBodyZone,
      warmthTier: g.warmthTier,
      windResistTier: g.windResistTier,
      waterResistTier: g.waterResistTier,
      breathabilityTier: g.breathabilityTier,
      material: g.material,
      hasVentilation: g.hasVentilation,
      isHeated: g.isHeated,
      activityTags,
      components: g.components.map((c) => ({
        id: c.id,
        kind: c.kind,
        name: c.name,
        warmthDelta: c.warmthDelta,
        windResistDelta: c.windResistDelta,
        waterResistDelta: c.waterResistDelta,
        breathabilityDelta: c.breathabilityDelta,
      })),
    };
  }
}
