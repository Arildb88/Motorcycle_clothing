/**
 * Provider-neutral route analysis types.
 *
 * Routing adapters (Google, Mapbox, ORS, …) MUST map into these shapes.
 * The motorcycle exposure engine consumes RouteAnalysis / travel segments —
 * never provider SDKs or response DTOs.
 *
 * expectedSpeedKmh is travel-realistic (often duration/distance), NOT the
 * legal speed limit. speedLimitKmh is diagnostic only when known.
 */

import type { RoutePreferences } from '../domain/ride-planning';

export type GeoPoint = {
  lat: number;
  lon: number;
};

export type RouteTravelSegment = {
  index: number;
  durationMin: number;
  expectedSpeedKmh: number;
  distanceM?: number;
  /** Legal limit when known — not used as airflow speed. */
  speedLimitKmh?: number | null;
  roadClass?: string | null;
  start: GeoPoint;
  end: GeoPoint;
  /** Travel heading degrees clockwise from north, when known. */
  headingDeg?: number | null;
};

export type RouteGeometry = {
  /** Encoded or raw polyline abstraction — opaque to the domain engine. */
  encoding?: 'polyline' | 'polyline6' | 'geojson' | 'none';
  /** Provider-opaque geometry string/blob; prefer not to persist densely. */
  data?: string | null;
  points?: GeoPoint[];
};

export type RouteAnalysisMeta = {
  provider: string;
  /** true when geometry/ETA came from a real routing provider. */
  fromProvider: boolean;
  /** true when NullRoutingAdapter / linear ETA fallback was used. */
  fallback: boolean;
  analyzedAt: string;
};

/**
 * Result of analyzing a planned path. Suitable as input to:
 * - time-aware weather sampling along the route
 * - motorcycle duration-weighted speed exposure
 * - future Find My Best Time candidate evaluation
 */
export type RouteAnalysis = {
  distanceM: number;
  durationMin: number;
  geometry: RouteGeometry;
  travelSegments: RouteTravelSegment[];
  preferencesApplied: RoutePreferences;
  meta: RouteAnalysisMeta;
};

export type RoutingRequest = {
  waypoints: GeoPoint[];
  /** Reusable route preferences (avoid motorways, …). */
  preferences?: RoutePreferences;
  /** Planned departure (UTC). Used for traffic-aware ETA when provider supports it. */
  departAt?: Date | null;
  /**
   * Optional total duration hint for fallback adapters (minutes).
   * Provider adapters typically ignore this and return their own ETA.
   */
  durationMin?: number;
  /** Soft hint — motorcycle / drive — never Google-specific enums. */
  travelProfile?: 'motorcycle' | 'drive';
};
