import type { RoutePreferences } from '../domain/ride-planning';
import { NullRoutingAdapter } from './null-routing.adapter';
import type { RoutingPort } from './routing.port';
import type { GeoPoint, RouteAnalysis } from './routing.types';

/**
 * Persist waypoint endpoints only. Full road polylines stay ephemeral.
 */
export function persistedRouteAnalysis(analysis: RouteAnalysis): RouteAnalysis {
  const fromSegments: GeoPoint[] =
    analysis.travelSegments.length > 0
      ? [
          analysis.travelSegments[0].start,
          ...analysis.travelSegments.map((segment) => segment.end),
        ]
      : [];
  return {
    ...analysis,
    geometry: {
      encoding: 'none',
      data: null,
      points: fromSegments.length >= 2 ? fromSegments : analysis.geometry.points,
    },
  };
}

/**
 * Use a configured routing provider when it returns road distance/duration.
 * Otherwise keep the duration hint via NullRoutingAdapter (tests and outages).
 */
export async function analyzePlanRoute(input: {
  port: RoutingPort;
  waypoints: GeoPoint[];
  preferences?: RoutePreferences;
  departAt: Date;
  durationHintMin: number;
}): Promise<RouteAnalysis | null> {
  if (!(input.port instanceof NullRoutingAdapter)) {
    const provider = await input.port.analyze({
      waypoints: input.waypoints,
      preferences: input.preferences,
      departAt: input.departAt,
      travelProfile: 'drive',
    });
    if (provider?.meta.fromProvider && !provider.meta.fallback) {
      return persistedRouteAnalysis(provider);
    }
  }

  const fallback = await new NullRoutingAdapter().analyze({
    waypoints: input.waypoints,
    preferences: input.preferences,
    departAt: input.departAt,
    durationMin: input.durationHintMin,
    travelProfile: 'motorcycle',
  });
  return fallback ? persistedRouteAnalysis(fallback) : null;
}
