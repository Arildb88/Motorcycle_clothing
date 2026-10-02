import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ELEVATION_PORT,
  type ElevationPort,
} from '../elevation/elevation.port';
import { lookupSampleAltitudes } from '../elevation/lookup-sample-altitudes';
import { RoutesService } from '../routes/routes.service';
import { WeatherService } from '../weather/weather.service';
import { PrismaService } from '../prisma/prisma.service';
import { MVP_ACTIVITY_TYPE, parseRoutePreferences } from '../domain';
import { OpenRouteServiceRoutingAdapter } from '../routing/ors-routing.adapter';
import {
  resolveRouteWeatherSamples,
  type RouteWeatherSample,
} from '../routing/route-weather-sampling';
import type { GeoPoint, RouteLegTiming } from '../routing/routing.types';
import {
  isAlpineDiscipline,
  planAlpineWeatherSamples,
  resolveAlpineSites,
  runAlpineRecommendationPipeline,
  type AlpineKitItem,
} from './alpine';
import {
  runCyclingRecommendationPipeline,
  type CyclingKitItem,
} from './cycling';
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
    @Inject(ELEVATION_PORT) private readonly elevations: ElevationPort,
  ) {}

  async forUser(
    userId: string,
    routeId?: string,
    _departureAt?: string,
    intensity?: string,
    exposure?: string,
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

    if (route.activityType === 'cycling') {
      return this.forCycling(userId, route, _departureAt, intensity);
    }

    if (isAlpineDiscipline(route.activityType)) {
      return this.forAlpine(userId, route, _departureAt, exposure);
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
    const shrunk = n > 0 ? personalWeight * (offset?.meanResidual ?? 0) : 0;
    const personalColdBiasC = -(profile?.coldSensitivity ?? 0) + shrunk;

    const departAt = parseDeparture(_departureAt);
    const fallbackPoints = this.routes.weatherPointsFor(route);
    const road = await this.roadGeometryFor(route, fallbackPoints);
    const sampled = resolveRouteWeatherSamples({
      roadGeometry: road?.points,
      providerDurationMin: road?.durationMin,
      providerLegs: road?.legs,
      fallbackPoints,
      fallbackDurationMin: route.typicalDurationMin ?? 30,
      departAt,
    });
    const elevation = await lookupSampleAltitudes(
      this.elevations,
      sampled.samples.map((sample) => ({
        lat: sample.lat,
        lon: sample.lon,
      })),
    );
    const weather = await this.weather.forRouteSamples(
      sampled.samples.map((sample, index) => ({
        lat: sample.lat,
        lon: sample.lon,
        at: sample.at,
        altitudeM: elevation.points[index]?.elevationM ?? null,
      })),
    );
    if (elevation.attribution) {
      weather.elevation = {
        provider: elevation.provider,
        attribution: elevation.attribution,
      };
    }
    const routeTravelSegments = this.travelForRoadSamples(
      sampled.usedRoadGeometry,
      sampled.samples,
      sampled.durationMin,
      road?.distanceM,
      sampled.appliedLegs,
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
      // engine keeps every ETA sample. Provider legs, when returned, set the
      // ETA and the speed of each distance band. Without a road line, speed
      // stays the assumed default and samples stay on saved waypoints.
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

  /**
   * Cycling foundation. Reuses route sampling, ETA, and ground elevation.
   * Does not read motorcycle personal offsets or cold-sensitivity shrinkage.
   */
  private async forCycling(
    userId: string,
    route: {
      id: string;
      name: string;
      description: string | null;
      activityType: string;
      routeKind: string;
      category: string | null;
      isFavorite: boolean;
      isDefaultCommute: boolean;
      startLabel: string | null;
      endLabel: string | null;
      startLat: number;
      startLon: number;
      endLat: number;
      endLon: number;
      typicalDurationMin: number | null;
      preferencesJson?: string | null;
      waypoints?: Array<{
        sortOrder: number;
        lat: number;
        lon: number;
        label: string | null;
      }>;
    },
    departureAt: string | undefined,
    intensity: string | undefined,
  ) {
    const departAt = parseDeparture(departureAt);
    const fallbackPoints = this.routes.weatherPointsFor(route);
    const road = await this.roadGeometryFor(route, fallbackPoints, 'cycling');
    const sampled = resolveRouteWeatherSamples({
      roadGeometry: road?.points,
      providerDurationMin: road?.durationMin,
      providerLegs: road?.legs,
      fallbackPoints,
      fallbackDurationMin: route.typicalDurationMin ?? 60,
      departAt,
    });
    const elevation = await lookupSampleAltitudes(
      this.elevations,
      sampled.samples.map((sample) => ({
        lat: sample.lat,
        lon: sample.lon,
      })),
    );
    const weather = await this.weather.forRouteSamples(
      sampled.samples.map((sample, index) => ({
        lat: sample.lat,
        lon: sample.lon,
        at: sample.at,
        altitudeM: elevation.points[index]?.elevationM ?? null,
      })),
    );
    if (elevation.attribution) {
      weather.elevation = {
        provider: elevation.provider,
        attribution: elevation.attribution,
      };
    }
    const routeTravelSegments = this.travelForRoadSamples(
      sampled.usedRoadGeometry,
      sampled.samples,
      sampled.durationMin,
      road?.distanceM,
      sampled.appliedLegs,
    );
    const garments = await this.prisma.garment.findMany({
      where: { userId },
      include: { components: true },
    });
    const engine = runCyclingRecommendationPipeline({
      weather,
      wardrobe: garments.map((garment) => this.toGarmentInput(garment)),
      rideDurationMin: sampled.durationMin,
      intensity,
      routeTravelSegments,
      geometryFallback: !sampled.usedRoadGeometry,
    });
    const items = [
      ...engine.wear.map((item) => this.kitLabel(item)),
      ...engine.pack.map((item) => `Pack: ${this.kitLabel(item)}`),
    ];
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
        waypoints: route.waypoints?.map((waypoint) => ({
          sortOrder: waypoint.sortOrder,
          lat: waypoint.lat,
          lon: waypoint.lon,
          label: waypoint.label,
        })),
      },
      departureAt: departureAt ?? new Date().toISOString(),
      weather,
      comfort: {
        coldSensitivity: null,
        personalSampleCount: 0,
        personalWeight: 0,
        personalColdBiasC: 0,
        intensity: engine.intensity,
        intensityAssumed: engine.intensityAssumed,
      },
      recommendation: {
        engine: engine.engine,
        effectiveTempC: engine.exposure.cyclingExposureSustainedC,
        exposure: engine.exposure,
        demand: engine.demand,
        wear: engine.wear,
        pack: engine.pack,
        reasons: engine.reasons,
        confidence: engine.confidence,
        items,
        reasonCodes: engine.reasons.map((reason) => reason.code),
        voice: engine.personalization.voice,
        geometry: engine.geometry,
        elevation: engine.elevation,
      },
      personalization: {
        ...engine.personalization,
        reason: 'Cycling foundation does not apply motorcycle personal offsets',
      },
    };
  }

  /**
   * Alpine and snowboard share one exposure engine. The saved points are the
   * session sites, not a road. Each forecast uses that site's own elevation.
   * Motorcycle offsets and road routing are not used.
   */
  private async forAlpine(
    userId: string,
    route: {
      id: string;
      name: string;
      description: string | null;
      activityType: string;
      routeKind: string;
      category: string | null;
      isFavorite: boolean;
      isDefaultCommute: boolean;
      startLabel: string | null;
      endLabel: string | null;
      startLat: number;
      startLon: number;
      endLat: number;
      endLon: number;
      typicalDurationMin: number | null;
      waypoints?: Array<{
        sortOrder: number;
        lat: number;
        lon: number;
        label: string | null;
      }>;
    },
    departureAt: string | undefined,
    exposure: string | undefined,
  ) {
    if (!isAlpineDiscipline(route.activityType)) {
      throw new Error(
        'Alpine recommendation requires alpine_skiing or snowboarding',
      );
    }
    const discipline = route.activityType;
    const departAt = parseDeparture(departureAt);
    const pins =
      route.waypoints && route.waypoints.length > 0
        ? [...route.waypoints]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((waypoint) => ({
              lat: waypoint.lat,
              lon: waypoint.lon,
              label: waypoint.label,
            }))
        : [
            {
              lat: route.startLat,
              lon: route.startLon,
              label: route.startLabel,
            },
            {
              lat: route.endLat,
              lon: route.endLon,
              label: route.endLabel,
            },
          ];
    const elevation = await lookupSampleAltitudes(
      this.elevations,
      pins.map((pin) => ({ lat: pin.lat, lon: pin.lon })),
    );
    const plan = resolveAlpineSites(
      pins.map((pin, index) => ({
        ...pin,
        elevationM: elevation.points[index]?.elevationM ?? null,
      })),
    );
    const requests = planAlpineWeatherSamples({
      sites: plan.sites,
      departAt,
      durationMin: route.typicalDurationMin ?? 240,
    });
    const fetched =
      requests.length === 0
        ? null
        : await this.weather.forRouteSamples(
            requests.map((request) => ({
              lat: request.lat,
              lon: request.lon,
              at: request.at,
              altitudeM: request.altitudeM,
            })),
          );
    const samples = requests.flatMap((request, index) => {
      const point = fetched?.points[index];
      if (!point) return [];
      return [
        {
          role: request.role,
          phase: request.phase,
          estimated: request.estimated,
          weather: {
            ...point,
            lat: request.lat,
            lon: request.lon,
            forecastAt: request.at.toISOString(),
            groundElevationM: request.altitudeM,
          },
        },
      ];
    });
    const garments = await this.prisma.garment.findMany({
      where: { userId },
      include: { components: true },
    });
    const engine = runAlpineRecommendationPipeline({
      discipline,
      exposureMode: exposure,
      durationMin: route.typicalDurationMin ?? 240,
      plan,
      samples,
      wardrobe: garments.map((garment) => this.toGarmentInput(garment)),
    });
    const temps = samples.map((sample) => sample.weather.airTempC);
    const rains = samples.map((sample) => sample.weather.precipitationProbPct);
    const precips = samples.map((sample) => sample.weather.precipitationMm);
    const winds = samples.map((sample) => sample.weather.windSpeedMs);
    const weather = {
      provider: fetched?.provider ?? 'none',
      sampledAt: fetched?.sampledAt ?? new Date().toISOString(),
      points: samples.map((sample) => sample.weather),
      minTempC: temps.length > 0 ? Math.min(...temps) : 0,
      maxTempC: temps.length > 0 ? Math.max(...temps) : 0,
      maxRainProbPct: rains.length > 0 ? Math.max(...rains) : 0,
      maxPrecipMm: precips.length > 0 ? Math.max(...precips) : 0,
      maxWindMs: winds.length > 0 ? Math.max(...winds) : 0,
      elevation: elevation.attribution
        ? {
            provider: elevation.provider,
            attribution: elevation.attribution,
          }
        : null,
    };
    const items = [
      ...engine.wear.map((item) => this.kitLabel(item)),
      ...engine.pack.map((item) => `Pack: ${this.kitLabel(item)}`),
    ];
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
        waypoints: route.waypoints?.map((waypoint) => ({
          sortOrder: waypoint.sortOrder,
          lat: waypoint.lat,
          lon: waypoint.lon,
          label: waypoint.label,
        })),
      },
      departureAt: departureAt ?? new Date().toISOString(),
      weather,
      comfort: {
        coldSensitivity: null,
        personalSampleCount: 0,
        personalWeight: 0,
        personalColdBiasC: 0,
        exposureMode: engine.exposureMode,
        exposureModeAssumed: engine.exposureModeAssumed,
      },
      recommendation: {
        engine: engine.engine,
        discipline: engine.discipline,
        effectiveTempC: engine.exposure.wornExposureC,
        exposure: engine.exposure,
        wear: engine.wear,
        pack: engine.pack,
        reasons: engine.reasons,
        confidence: engine.confidence,
        items,
        reasonCodes: engine.reasons.map((reason) => reason.code),
        voice: engine.personalization.voice,
        elevation: engine.elevation,
      },
      personalization: {
        ...engine.personalization,
        reason:
          'Alpine foundation does not apply motorcycle personal offsets or road routing',
      },
    };
  }

  private async roadGeometryFor(
    route: { preferencesJson?: string | null },
    waypoints: GeoPoint[],
    travelProfile: 'drive' | 'cycling' = 'drive',
  ): Promise<{
    points: GeoPoint[];
    distanceM: number;
    durationMin: number;
    legs: RouteLegTiming[] | null;
  } | null> {
    if (!this.roadRouting.isConfigured || waypoints.length < 2) return null;
    try {
      const source = await this.roadRouting.roadWeatherSource({
        waypoints,
        preferences: parseRoutePreferences(route.preferencesJson),
        travelProfile,
      });
      if (!source) return null;
      return source;
    } catch {
      return null;
    }
  }

  private travelForRoadSamples(
    usedRoadGeometry: boolean,
    samples: RouteWeatherSample[],
    durationMin: number,
    distanceM?: number,
    legs?: RouteLegTiming[] | null,
  ): RouteTravelSegment[] | undefined {
    if (!usedRoadGeometry || samples.length === 0) return undefined;
    if (distanceM == null || !(distanceM > 0)) return undefined;
    const segments = routeTravelAlignedWithSamples({
      samples,
      durationMin,
      distanceM,
      legs,
    });
    return segments.length > 0 ? segments : undefined;
  }

  private kitLabel(item: KitItem | CyclingKitItem | AlpineKitItem): string {
    if (item.source === 'wardrobe' && item.garmentName) {
      const configs = item.configuration
        .map((c) => c.code.toLowerCase().replace(/_/g, ' '))
        .join(', ');
      return configs ? `${item.garmentName} (${configs})` : item.garmentName;
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
