import { parseRoutePreferences } from '../domain/ride-planning';
import type { RoutingPort } from './routing.port';
import type {
  GeoPoint,
  RouteAnalysis,
  RouteTravelSegment,
  RoutingRequest,
} from './routing.types';

/**
 * Deterministic fallback when no external routing provider is configured.
 *
 * Strategy (v1, replaceable):
 * - Haversine distance between consecutive waypoints
 * - Split total duration proportionally to segment distance
 * - expectedSpeedKmh = distance / duration per segment
 *
 * Does NOT invent traffic, motorway geometry, or legal speed limits.
 */
export class NullRoutingAdapter implements RoutingPort {
  async analyze(request: RoutingRequest): Promise<RouteAnalysis | null> {
    const waypoints = request.waypoints.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon),
    );
    if (waypoints.length < 2) return null;

    const preferences = parseRoutePreferences(request.preferences ?? {});
    const legDistances = pairwiseDistancesM(waypoints);
    const totalDistanceM = legDistances.reduce((s, d) => s + d, 0);

    // Without a provider ETA, prefer an explicit duration hint; else ~70 km/h.
    const durationMin = Math.max(
      1,
      Math.round(
        request.durationMin ??
          Math.max(1, (totalDistanceM / 1000 / 70) * 60),
      ),
    );

    const travelSegments: RouteTravelSegment[] = legDistances.map(
      (distanceM, index) => {
        const fraction =
          totalDistanceM > 0 ? distanceM / totalDistanceM : 1 / legDistances.length;
        const segDuration = Math.max(1, Math.round(durationMin * fraction));
        const hours = segDuration / 60;
        const expectedSpeedKmh =
          hours > 0 && distanceM > 0
            ? Math.round((distanceM / 1000 / hours) * 10) / 10
            : 0;
        return {
          index,
          durationMin: segDuration,
          distanceM: Math.round(distanceM),
          expectedSpeedKmh,
          start: waypoints[index],
          end: waypoints[index + 1],
          headingDeg: headingDeg(waypoints[index], waypoints[index + 1]),
        };
      },
    );

    // Re-normalize durations so sum ≈ durationMin (rounding drift).
    const sum = travelSegments.reduce((s, t) => s + t.durationMin, 0);
    if (sum !== durationMin && travelSegments.length > 0) {
      travelSegments[travelSegments.length - 1].durationMin = Math.max(
        1,
        travelSegments[travelSegments.length - 1].durationMin +
          (durationMin - sum),
      );
    }

    return {
      distanceM: Math.round(totalDistanceM),
      durationMin,
      geometry: {
        encoding: 'none',
        points: waypoints,
      },
      travelSegments,
      preferencesApplied: preferences,
      meta: {
        provider: 'null',
        fromProvider: false,
        fallback: true,
        analyzedAt: new Date().toISOString(),
      },
    };
  }
}

/** Convenience: analyze with an explicit total duration (plan / typical). */
export async function analyzeWithDuration(
  port: RoutingPort,
  request: RoutingRequest & { durationMin: number },
): Promise<RouteAnalysis | null> {
  return port.analyze(request);
}

function pairwiseDistancesM(points: GeoPoint[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    out.push(haversineM(points[i], points[i + 1]));
  }
  return out;
}

function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function headingDeg(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
