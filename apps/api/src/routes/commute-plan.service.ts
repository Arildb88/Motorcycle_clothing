import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ELEVATION_PORT,
  type ElevationPort,
} from '../elevation/elevation.port';
import { lookupSampleAltitudes } from '../elevation/lookup-sample-altitudes';
import {
  MVP_ACTIVITY_TYPE,
  THERMAL_SHRINKAGE_K,
  appliedThermalBiasC,
  parseActivityTags,
  parseRoutePreferences,
  parseStoredSharedCategories,
  prepareRecommendationWardrobe,
} from '../domain';
import {
  commuteDifferenceCodes,
  composeCommutePreparation,
  osloParts,
  resolveCommuteClocks,
  reverseWaypoints,
} from '../domain/commute';
import { explainKitItems } from '../recommend/explain-kit';
import {
  runMotorcycleRecommendationPipeline,
  type GarmentInput,
  type KitItem,
  type MotorcycleRecommendationResult,
} from '../recommend/motorcycle';
import type { LegForecast, RouteWeatherSummary } from '../recommend/weather.types';
import { WeatherService } from '../weather/weather.service';
import {
  analyzePlanRoute,
  UnavailableRoutingAdapter,
  resolveRouteWeatherSamples,
  ROUTING_PORT,
  type RoutingPort,
} from '../routing';
import type { GeoPoint, RouteAnalysis } from '../routing/routing.types';
import { RoutesService } from './routes.service';
import { CommutePlanDto } from './dto/commute-plan.dto';

type RouteWaypointRow = {
  sortOrder: number;
  lat: number;
  lon: number;
  label: string | null;
  address: string | null;
  waypointType: string | null;
};

type CommuteRoute = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  activityType: string;
  routeKind: string;
  category: string | null;
  typicalDurationMin: number;
  preferencesJson: string;
  startLabel: string | null;
  endLabel: string | null;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  waypoints: RouteWaypointRow[];
};

type LegDraft = {
  leg: 'outbound' | 'return';
  departAt: Date;
  arrivalAt: Date;
  durationMin: number;
  waypoints: RouteWaypointRow[];
  analysis: RouteAnalysis | null;
  forecast: LegForecast;
  engine: MotorcycleRecommendationResult | null;
  ambiguous: boolean;
};

@Injectable()
export class CommutePlanService {
  private readonly routing: RoutingPort;

  constructor(
    private readonly routes: RoutesService,
    private readonly weather: WeatherService,
    private readonly prisma: PrismaService,
    @Inject(ELEVATION_PORT) private readonly elevations: ElevationPort,
    @Optional() @Inject(ROUTING_PORT) routing?: RoutingPort,
  ) {
    this.routing = routing ?? new UnavailableRoutingAdapter('not_configured');
  }

  async plan(userId: string, routeId: string, dto: CommutePlanDto) {
    const route = (await this.routes.get(userId, routeId)) as CommuteRoute;
    if (route.userId !== userId) throw new ForbiddenException();
    if (route.category !== 'commute') {
      throw new BadRequestException({
        code: 'COMMUTE_ROUTE_REQUIRED',
        message: 'Choose a saved commute route',
      });
    }
    if (route.activityType !== MVP_ACTIVITY_TYPE) {
      throw new BadRequestException({
        code: 'COMMUTE_MOTORCYCLE_ONLY',
        message: 'Commute planning is available for motorcycle first',
      });
    }

    const clocks = resolveCommuteClocks({
      date: dto.date,
      outboundTime: dto.outboundTime,
      returnTime: dto.returnTime,
      returnNextDay: dto.returnNextDay === true,
    });
    if (!clocks.ok) {
      throw new BadRequestException({
        code: clocks.reason === 'gap' ? 'OSLO_TIME_GAP' : 'INVALID_LOCAL_TIME',
        message:
          clocks.reason === 'gap'
            ? 'That Europe/Oslo time does not exist on this date'
            : 'Date and times must be a real Europe/Oslo clock time',
        field: clocks.field,
      });
    }
    if (clocks.returnAt.getTime() <= clocks.outbound.getTime()) {
      throw new BadRequestException({
        code: 'RETURN_BEFORE_ARRIVAL',
        message: 'Return departure must be after the outbound arrival',
      });
    }

    const wardrobe = await this.loadWardrobe(userId);
    const calibration = await this.thermalCalibration(userId);
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const personalColdBiasC =
      -(profile?.coldSensitivity ?? 0) + calibration.appliedBiasC;

    const outboundWaypoints = [...route.waypoints].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const outbound = await this.analyzeLeg({
      route,
      leg: 'outbound',
      waypoints: outboundWaypoints,
      departAt: clocks.outbound,
      ambiguous: clocks.outboundAmbiguous,
      wardrobe,
      personalColdBiasC,
      calibration,
    });
    if (clocks.returnAt.getTime() <= outbound.arrivalAt.getTime()) {
      throw new BadRequestException({
        code: 'RETURN_BEFORE_ARRIVAL',
        message: 'Return departure must be after the outbound arrival',
      });
    }

    const returnLeg = await this.analyzeLeg({
      route,
      leg: 'return',
      waypoints: reverseWaypoints(outboundWaypoints).map((waypoint, index) => ({
        ...waypoint,
        sortOrder: index,
      })),
      departAt: clocks.returnAt,
      ambiguous: clocks.returnAmbiguous,
      wardrobe,
      personalColdBiasC,
      calibration,
    });

    const commuteGroupId = randomUUID();
    const outboundPlan = await this.persistLeg(userId, route, commuteGroupId, outbound);
    const returnPlan = await this.persistLeg(userId, route, commuteGroupId, returnLeg);
    await this.routes.touchLastUsed(userId, route.id);

    const returnEngine = returnLeg.engine;
    const preparation = composeCommutePreparation(
      {
        wear: outbound.engine?.wear ?? [],
        pack: outbound.engine?.pack ?? [],
      },
      returnEngine
        ? { wear: returnEngine.wear, pack: returnEngine.pack }
        : null,
    );
    const outboundWeather = forecastWeather(outbound.forecast);
    const returnWeather = forecastWeather(returnLeg.forecast);

    return {
      commuteGroupId,
      route: {
        id: route.id,
        name: route.name,
        activityType: route.activityType,
      },
      differences: commuteDifferenceCodes(outboundWeather, returnWeather),
      preparation: {
        wear: explainKitItems(
          'motorcycle_v1',
          preparation.wear,
          outbound.engine?.reasons ?? [],
        ),
        pack: explainKitItems('motorcycle_v1', preparation.pack, [
          ...(outbound.engine?.reasons ?? []),
          ...(returnEngine?.reasons ?? []),
        ]),
        returnAdjustments: explainKitItems(
          'motorcycle_v1',
          preparation.returnAdjustments,
          returnEngine?.reasons ?? [],
        ),
      },
      legs: [
        this.presentLeg(outbound, outboundPlan.id),
        this.presentLeg(returnLeg, returnPlan.id),
      ],
      note: 'Forecasts are forecasts, not guarantees. Each leg uses its own time and direction.',
    };
  }

  private async analyzeLeg(input: {
    route: CommuteRoute;
    leg: 'outbound' | 'return';
    waypoints: RouteWaypointRow[];
    departAt: Date;
    ambiguous: boolean;
    wardrobe: GarmentInput[];
    personalColdBiasC: number;
    calibration: { n: number; shrinkageK: number };
  }): Promise<LegDraft> {
    const points: GeoPoint[] = input.waypoints.map((waypoint) => ({
      lat: waypoint.lat,
      lon: waypoint.lon,
    }));
    const preferences = parseRoutePreferences(input.route.preferencesJson);
    const analysis = await analyzePlanRoute({
      port: this.routing,
      waypoints: points,
      preferences,
      departAt: input.departAt,
      durationHintMin: input.route.typicalDurationMin,
    });
    const providerAnalysis =
      analysis?.meta.fromProvider && !analysis.meta.fallback ? analysis : null;
    const durationMin =
      providerAnalysis?.durationMin ?? input.route.typicalDurationMin;
    const sampled = resolveRouteWeatherSamples({
      fallbackPoints: points,
      fallbackDurationMin: durationMin,
      departAt: input.departAt,
    });
    const elevation = await lookupSampleAltitudes(
      this.elevations,
      sampled.samples.map((sample) => ({ lat: sample.lat, lon: sample.lon })),
    );
    const forecast = await this.weather.forecastLeg(
      sampled.samples.map((sample, index) => ({
        lat: sample.lat,
        lon: sample.lon,
        at: sample.at,
        altitudeM: elevation.points[index]?.elevationM ?? null,
      })),
    );
    const engine = forecast.available
      ? runMotorcycleRecommendationPipeline({
          weather: forecast.weather,
          wardrobe: input.wardrobe,
          rideDurationMin: durationMin,
          cruiseKmh: null,
          personalColdBiasC: input.personalColdBiasC,
          personalSampleCount: input.calibration.n,
          shrinkageK: input.calibration.shrinkageK,
        })
      : null;
    return {
      leg: input.leg,
      departAt: input.departAt,
      arrivalAt: new Date(input.departAt.getTime() + durationMin * 60_000),
      durationMin,
      waypoints: input.waypoints,
      analysis: providerAnalysis,
      forecast,
      engine,
      ambiguous: input.ambiguous,
    };
  }

  private async persistLeg(
    userId: string,
    route: CommuteRoute,
    commuteGroupId: string,
    leg: LegDraft,
  ) {
    const snapshot = {
      version: 2,
      source: 'commute',
      commuteGroupId,
      commuteLeg: leg.leg,
      savedRouteId: route.id,
      name: route.name,
      description: route.description,
      activityType: route.activityType,
      routeKind: route.routeKind,
      category: route.category,
      typicalDurationMin: route.typicalDurationMin,
      preferences: parseRoutePreferences(route.preferencesJson),
      planningMode: 'departure',
      departureAt: leg.departAt.toISOString(),
      arrivalAt: leg.arrivalAt.toISOString(),
      waypoints: leg.waypoints.map((waypoint, index) => ({
        sortOrder: index,
        lat: waypoint.lat,
        lon: waypoint.lon,
        label: waypoint.label,
        address: waypoint.address,
        waypointType: waypoint.waypointType,
      })),
      snappedAt: new Date().toISOString(),
    };
    return this.prisma.activityPlan.create({
      data: {
        userId,
        activityType: route.activityType,
        routeId: route.id,
        planningMode: 'departure',
        departureAt: leg.departAt,
        arrivalAt: leg.arrivalAt,
        durationMin: leg.durationMin,
        snapshotJson: JSON.stringify(snapshot),
        routeAnalysisJson: leg.analysis ? JSON.stringify(leg.analysis) : null,
        commuteGroupId,
        commuteLeg: leg.leg,
      },
    });
  }

  private presentLeg(leg: LegDraft, planId: string) {
    const departure = osloParts(leg.departAt);
    const arrival = osloParts(leg.arrivalAt);
    const weather = forecastWeather(leg.forecast);
    const first = leg.waypoints[0];
    const last = leg.waypoints[leg.waypoints.length - 1];
    return {
      leg: leg.leg,
      planId,
      departureAt: leg.departAt.toISOString(),
      arrivalAt: leg.arrivalAt.toISOString(),
      departureLocal: departure?.time ?? null,
      arrivalLocal: arrival?.time ?? null,
      civilDate: departure?.civilDate ?? null,
      durationMin: leg.durationMin,
      ambiguousLocalTime: leg.ambiguous,
      available: leg.forecast.available,
      routingAvailable: leg.analysis != null,
      ...(leg.forecast.available
        ? {}
        : { unavailableReason: leg.forecast.reason }),
      startLabel: first?.label ?? null,
      endLabel: last?.label ?? null,
      ...(weather ? { weather: publicWeather(weather) } : {}),
      ...(leg.engine
        ? {
            recommendation: {
              engine: leg.engine.engine,
              wear: explainKitItems(
                'motorcycle_v1',
                leg.engine.wear,
                leg.engine.reasons,
              ),
              pack: explainKitItems(
                'motorcycle_v1',
                leg.engine.pack,
                leg.engine.reasons,
              ),
              confidence: leg.engine.confidence,
              reasons: leg.engine.reasons,
              exposure: {
                motorcycleExposureSustainedC:
                  leg.engine.exposure.motorcycleExposureSustainedC,
              },
            },
          }
        : {}),
    };
  }

  private async thermalCalibration(userId: string) {
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
    return {
      n,
      shrinkageK: THERMAL_SHRINKAGE_K,
      appliedBiasC: appliedThermalBiasC(offset),
    };
  }

  private async loadWardrobe(userId: string): Promise<GarmentInput[]> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const garments = await this.prisma.garment.findMany({
      where: { userId },
      include: { components: true },
    });
    const shared = parseStoredSharedCategories(
      profile?.sharedWardrobeCategoriesJson,
    );
    const tagged = garments.map((garment) => ({
      ...this.toGarmentInput(garment),
      isDemo: garment.isDemo === true,
    }));
    return prepareRecommendationWardrobe(tagged, MVP_ACTIVITY_TYPE, shared).map(
      (garment) => {
        const { isDemo, ...input } = garment;
        void isDemo;
        return input;
      },
    );
  }

  private toGarmentInput(garment: {
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
    return {
      id: garment.id,
      name: garment.name,
      category: garment.category,
      layer: garment.layer,
      primaryBodyZone: garment.primaryBodyZone,
      warmthTier: garment.warmthTier,
      windResistTier: garment.windResistTier,
      waterResistTier: garment.waterResistTier,
      breathabilityTier: garment.breathabilityTier,
      material: garment.material,
      hasVentilation: garment.hasVentilation,
      isHeated: garment.isHeated,
      activityTags: parseActivityTags(garment.activityTagsJson),
      components: garment.components.map((component) => ({
        id: component.id,
        kind: component.kind,
        name: component.name,
        warmthDelta: component.warmthDelta,
        windResistDelta: component.windResistDelta,
        waterResistDelta: component.waterResistDelta,
        breathabilityDelta: component.breathabilityDelta,
      })),
    };
  }
}

function forecastWeather(forecast: LegForecast): RouteWeatherSummary | null {
  return forecast.available ? forecast.weather : null;
}

function publicWeather(weather: RouteWeatherSummary) {
  return {
    provider: weather.provider,
    sampledAt: weather.sampledAt,
    minTempC: weather.minTempC,
    maxTempC: weather.maxTempC,
    maxRainProbPct: weather.maxRainProbPct,
    maxPrecipMm: weather.maxPrecipMm,
    maxWindMs: weather.maxWindMs,
    points: weather.points.map((point) => ({
      lat: point.lat,
      lon: point.lon,
      airTempC: point.airTempC,
      precipitationProbPct: point.precipitationProbPct,
      precipitationMm: point.precipitationMm,
      windSpeedMs: point.windSpeedMs,
      ...(point.forecastAt ? { forecastAt: point.forecastAt } : {}),
    })),
  };
}

export type { KitItem };
