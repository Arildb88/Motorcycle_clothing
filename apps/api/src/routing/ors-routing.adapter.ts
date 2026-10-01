import { Logger } from '@nestjs/common';
import { parseRoutePreferences, type RoutePreferences } from '../domain/ride-planning';
import {
  DRIVING_GEOMETRY_NOTICE,
  DRIVING_GEOMETRY_NOTICE_CODE,
  HEIGIT_ORS_BASE_URL,
  resolveOrsBaseUrl,
} from './ors.constants';
import { orsAuthHeaders, orsPost, type OrsHttpPost } from './ors.http';
import type { RoutingPort } from './routing.port';
import type {
  GeoPoint,
  RouteAnalysis,
  RouteTravelSegment,
  RoutingRequest,
} from './routing.types';

const logger = new Logger('OpenRouteServiceRoutingAdapter');

export type RoutePreviewResult = {
  points: GeoPoint[];
  distanceM: number;
  durationMin: number;
  travelMode: 'driving';
  usedFallbackTravelMode: false;
  noticeCode: typeof DRIVING_GEOMETRY_NOTICE_CODE;
  providerWarning: string;
};

type ProviderLeg = {
  distanceM: number;
  durationSec: number;
};

/**
 * OpenRouteService directions via the current HeiGIT host.
 *
 * Profile is `driving-car` (road-following driving geometry). This is not
 * motorcycle-optimized routing. Dense polylines are returned only from
 * [preview]; [analyze] keeps waypoint geometry so plans do not store the line.
 */
export class OpenRouteServiceRoutingAdapter implements RoutingPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly post: OrsHttpPost;

  constructor(options: {
    apiKey: string;
    baseUrl?: string | null;
    post?: OrsHttpPost;
  }) {
    this.apiKey = options.apiKey.trim();
    this.baseUrl = resolveOrsBaseUrl(options.baseUrl ?? HEIGIT_ORS_BASE_URL);
    this.post = options.post ?? orsPost;
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async analyze(request: RoutingRequest): Promise<RouteAnalysis | null> {
    const mapped = await this.fetchDirections(request);
    if (!mapped) return null;
    return mapped.analysis;
  }

  async preview(request: RoutingRequest): Promise<RoutePreviewResult | null> {
    const mapped = await this.fetchDirections(request);
    if (!mapped || mapped.previewPoints.length < 2) return null;
    return {
      points: mapped.previewPoints,
      distanceM: mapped.analysis.distanceM,
      durationMin: mapped.analysis.durationMin,
      travelMode: 'driving',
      usedFallbackTravelMode: false,
      noticeCode: DRIVING_GEOMETRY_NOTICE_CODE,
      providerWarning: DRIVING_GEOMETRY_NOTICE,
    };
  }

  private async fetchDirections(request: RoutingRequest): Promise<{
    analysis: RouteAnalysis;
    previewPoints: GeoPoint[];
  } | null> {
    if (!this.isConfigured) return null;
    const waypoints = validWaypoints(request.waypoints);
    if (waypoints.length < 2 || waypoints.length > 50) return null;

    const preferences = parseRoutePreferences(request.preferences ?? {});
    const avoid = avoidFeatures(preferences);
    const body: Record<string, unknown> = {
      coordinates: waypoints.map((point) => [point.lon, point.lat]),
    };
    if (avoid.length > 0) {
      body.options = { avoid_features: avoid };
    }

    const url = `${this.baseUrl}/v2/directions/driving-car/geojson`;
    let status: number | undefined;
    try {
      const res = await this.post(url, body, {
        ...orsAuthHeaders(this.apiKey),
        'Content-Type': 'application/json',
      });
      status = res.status;
      if (res.status < 200 || res.status >= 300) {
        logger.warn(`directions failed (status ${res.status})`);
        return null;
      }
      return mapOrsDirections(res.data, waypoints, preferences);
    } catch {
      logger.warn(
        `directions failed (status ${status != null ? status : 'network'})`,
      );
      return null;
    }
  }
}

export function mapOrsDirections(
  data: unknown,
  waypoints: GeoPoint[],
  preferences: RoutePreferences,
): { analysis: RouteAnalysis; previewPoints: GeoPoint[] } | null {
  const feature = firstFeature(data);
  if (!feature) return null;
  const geometry = feature.geometry;
  if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const previewPoints = geometry.coordinates
    .map(parseLonLat)
    .filter((point): point is GeoPoint => point != null);
  if (previewPoints.length < 2) return null;

  const summary = feature.properties?.summary;
  const distanceM = finiteNumber(summary?.distance);
  const durationSec = finiteNumber(summary?.duration);
  if (distanceM == null || durationSec == null) return null;

  const durationMin = minutesFromSeconds(durationSec);
  const roundedDistanceM = Math.max(0, Math.round(distanceM));
  const providerLegs = (feature.properties?.segments ?? [])
    .map((segment) => {
      const legDistance = finiteNumber(segment?.distance);
      const legDuration = finiteNumber(segment?.duration);
      if (legDistance == null || legDuration == null) return null;
      return { distanceM: legDistance, durationSec: legDuration };
    })
    .filter((leg): leg is ProviderLeg => leg != null);

  const travelSegments = buildTravelSegments(
    waypoints,
    providerLegs.length === waypoints.length - 1 ? providerLegs : null,
    roundedDistanceM,
    durationMin,
  );

  return {
    previewPoints,
    analysis: {
      distanceM: roundedDistanceM,
      durationMin,
      geometry: {
        encoding: 'none',
        data: null,
        points: waypoints,
      },
      travelSegments,
      preferencesApplied: parseRoutePreferences(preferences),
      meta: {
        provider: 'ors',
        fromProvider: true,
        fallback: false,
        analyzedAt: new Date().toISOString(),
      },
    },
  };
}

function avoidFeatures(preferences: RoutePreferences): string[] {
  const features: string[] = [];
  if (preferences.avoidMotorways) features.push('highways');
  if (preferences.avoidTolls) features.push('tollways');
  if (preferences.avoidFerries) features.push('ferries');
  return features;
}

function buildTravelSegments(
  waypoints: GeoPoint[],
  providerLegs: ProviderLeg[] | null,
  totalDistanceM: number,
  totalDurationMin: number,
): RouteTravelSegment[] {
  const legCount = waypoints.length - 1;
  const weights = providerLegs
    ? providerLegs.map((leg) => Math.max(0, leg.distanceM))
    : pairwiseDistancesM(waypoints);
  const weightSum = weights.reduce((sum, value) => sum + value, 0);

  const segments: RouteTravelSegment[] = [];
  for (let index = 0; index < legCount; index++) {
    const provider = providerLegs?.[index];
    const fraction =
      weightSum > 0 ? weights[index] / weightSum : 1 / legCount;
    const distanceM = provider
      ? Math.max(0, Math.round(provider.distanceM))
      : Math.max(0, Math.round(totalDistanceM * fraction));
    const durationMin = provider
      ? minutesFromSeconds(provider.durationSec)
      : Math.max(1, Math.round(totalDurationMin * fraction));
    segments.push({
      index,
      durationMin,
      distanceM,
      expectedSpeedKmh: speedKmh(distanceM, durationMin),
      start: waypoints[index],
      end: waypoints[index + 1],
      headingDeg: headingDeg(waypoints[index], waypoints[index + 1]),
    });
  }

  const durationSum = segments.reduce((sum, segment) => sum + segment.durationMin, 0);
  if (segments.length > 0 && durationSum !== totalDurationMin) {
    const last = segments[segments.length - 1];
    last.durationMin = Math.max(1, last.durationMin + (totalDurationMin - durationSum));
    last.expectedSpeedKmh = speedKmh(last.distanceM ?? 0, last.durationMin);
  }
  return segments;
}

type OrsFeature = {
  geometry?: { type?: string; coordinates?: unknown[] };
  properties?: {
    summary?: { distance?: unknown; duration?: unknown };
    segments?: Array<{ distance?: unknown; duration?: unknown } | null>;
  };
};

function firstFeature(data: unknown): OrsFeature | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { type?: string; features?: unknown[]; geometry?: unknown };
  if (record.type === 'Feature') return record as OrsFeature;
  const feature = record.features?.[0];
  if (!feature || typeof feature !== 'object') return null;
  return feature as OrsFeature;
}

function parseLonLat(value: unknown): GeoPoint | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = finiteNumber(value[0]);
  const lat = finiteNumber(value[1]);
  if (lat == null || lon == null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function minutesFromSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 1;
  return Math.max(1, Math.round(seconds / 60));
}

function speedKmh(distanceM: number, durationMin: number): number {
  const hours = durationMin / 60;
  if (hours <= 0 || distanceM <= 0) return 0;
  return Math.round((distanceM / 1000 / hours) * 10) / 10;
}

function validWaypoints(points: GeoPoint[]): GeoPoint[] {
  return points.filter(
    (point) =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lon) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lon >= -180 &&
      point.lon <= 180,
  );
}

function pairwiseDistancesM(points: GeoPoint[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    out.push(haversineM(points[i], points[i + 1]));
  }
  return out;
}

function haversineM(a: GeoPoint, b: GeoPoint): number {
  const earthM = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function headingDeg(a: GeoPoint, b: GeoPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const toDeg = (radians: number) => (radians * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
