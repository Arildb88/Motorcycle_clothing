import { Injectable, NotFoundException } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { WeatherService } from '../weather/weather.service';
import { PrismaService } from '../prisma/prisma.service';
import { MVP_ACTIVITY_TYPE, parseRoutePreferences } from '../domain';
import { OpenRouteServiceRoutingAdapter } from '../routing/ors-routing.adapter';
import {
  resolveRouteWeatherSamples,
  type RouteWeatherSample,
} from '../routing/route-weather-sampling';
import type { GeoPoint } from '../routing/routing.types';
import {
  MOTORCYCLE_EXPOSURE,
  routeTravelAlignedWithSamples,
  runMotorcycleRecommendationPipeline,
  type GarmentInput,
  type KitItem,
  type RouteTravelSegment,
} from './motorcycle';

/**
 * Motorcycle Recommendation Engine v1 (M3).
 *
 * Always recalculates weather for the selected route — never reads a
 * stored recommendation from Route.
 *
 * Personalization: shrinkage `n/(n+k)` bias only; no M5 learning claims.
 */
@Injectable()
export class RecommendService {
  constructor(
    private readonly routes: RoutesService,
    private readonly weather: WeatherService,
    private readonly prisma: PrismaService,
    private readonly roadRouting: OpenRouteServiceRoutingAdapter,
  ) {}

  async forUser(
    userId: string,
    routeId?: string,
    _departureAt?: string,
  ) {
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

    const departAt = parseDeparture(_departureAt);
    const fallbackPoints = this.routes.weatherPointsFor(route);
    const road = await this.roadGeometryFor(route, fallbackPoints);
    const sampled = resolveRouteWeatherSamples({
      roadGeometry: road?.points,
      providerDurationMin: road?.durationMin,
      fallbackPoints,
      fallbackDurationMin: route.typicalDurationMin ?? 30,
      departAt,
    });
    const weather = await this.weather.forRouteSamples(
      sampled.samples.map((sample) => ({
        lat: sample.lat,
        lon: sample.lon,
        at: sample.at,
      })),
    );
    const routeTravelSegments = this.travelForRoadSamples(
      sampled.usedRoadGeometry,
      sampled.samples,
      sampled.durationMin,
      road?.distanceM,
    );

    const garments = await this.prisma.garment.findMany({
      where: { userId },
      include: { components: true },
    });
    const wardrobe = garments.map((g) => this.toGarmentInput(g));

    const engine = runMotorcycleRecommendationPipeline({
      weather,
      wardrobe,
      rideDurationMin: sampled.durationMin,
      // Road geometry supplies one travel segment per weather sample so the
      // engine keeps every ETA sample. Without a road line, speed stays the
      // assumed default and samples stay on saved waypoints.
      cruiseKmh: null,
      routeTravelSegments,
      personalColdBiasC,
      personalSampleCount: n,
      shrinkageK: k,
    });

    // M3 may apply shrinkage bias but never emits personal preference claims (M5).
    const canClaimPersonal = false;

    // Compatibility fields for pre-M3 clients / smoke checks.
    const items = [
      ...engine.wear.map((i) => this.kitLabel(i)),
      ...engine.pack.map((i) => `Pack: ${this.kitLabel(i)}`),
    ];
    const reasonCodes = engine.reasons.map((r) => r.code);

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
      departureAt: _departureAt ?? new Date().toISOString(),
      weather,
      comfort: {
        coldSensitivity: profile?.coldSensitivity ?? 0,
        personalSampleCount: n,
        personalWeight,
        personalColdBiasC,
      },
      recommendation: {
        engine: engine.engine,
        // Compatibility alias for smoke / older UI metric.
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
        reasons: engine.reasons,
        confidence: engine.confidence,
        // Legacy list fields (labels / codes) — prefer wear/pack + reasons[].code
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

  private async roadGeometryFor(
    route: { preferencesJson?: string | null },
    waypoints: GeoPoint[],
  ): Promise<{
    points: GeoPoint[];
    distanceM: number;
    durationMin: number;
  } | null> {
    if (!this.roadRouting.isConfigured || waypoints.length < 2) return null;
    try {
      const preview = await this.roadRouting.preview({
        waypoints,
        preferences: parseRoutePreferences(route.preferencesJson),
        travelProfile: 'drive',
      });
      if (!preview || preview.points.length < 2) return null;
      if (!(preview.distanceM > 0) || !(preview.durationMin > 0)) return null;
      return {
        points: preview.points,
        distanceM: preview.distanceM,
        durationMin: preview.durationMin,
      };
    } catch {
      return null;
    }
  }

  private travelForRoadSamples(
    usedRoadGeometry: boolean,
    samples: RouteWeatherSample[],
    durationMin: number,
    distanceM?: number,
  ): RouteTravelSegment[] | undefined {
    if (!usedRoadGeometry || samples.length === 0) return undefined;
    if (distanceM == null || !(distanceM > 0)) return undefined;
    const segments = routeTravelAlignedWithSamples({
      samples,
      durationMin,
      distanceM,
    });
    return segments.length > 0 ? segments : undefined;
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

function parseDeparture(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}
