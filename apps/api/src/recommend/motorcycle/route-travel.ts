/**
 * Provider-neutral route travel / speed profile for motorcycle exposure.
 *
 * Routing providers (Google Routes, etc.) must adapt into this shape —
 * the M3 engine never imports provider SDKs or response DTOs.
 *
 * expectedSpeedKmh is travel-realistic speed (often from duration/distance),
 * NOT necessarily the legal speed limit. speedLimitKmh is diagnostic only.
 *
 * Adapter boundary: implement `RouteTravelAdapter<T>` outside this module
 * (e.g. Google Routes steps → RouteTravelSegment[]). Prefer ETA-derived
 * expectedSpeedKmh over legal limits for airflow exposure.
 */

export type SpeedSource =
  | 'route_profile'
  | 'explicit_cruise'
  | 'assumed_default';

export type RouteTravelSegment = {
  index: number;
  durationMin: number;
  expectedSpeedKmh: number;
  distanceM?: number;
  /** Legal limit when known — not used as airflow speed. */
  speedLimitKmh?: number | null;
  roadClass?: string | null;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  /** Travel heading (degrees clockwise from north), when known. */
  headingDeg?: number | null;
};

/** Transform a provider-specific routing response into RideWear travel segments. */
export type RouteTravelAdapter<TProviderResponse> = {
  toTravelSegments(response: TProviderResponse): RouteTravelSegment[];
};

/**
 * Build a single travel segment from total duration + distance.
 * Useful when a provider returns only overview ETA/distance.
 */
export function routeTravelFromDurationDistance(input: {
  durationMin: number;
  distanceM: number;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
}): RouteTravelSegment[] {
  const durationMin = Math.max(1, input.durationMin);
  const distanceM = Math.max(0, input.distanceM);
  const hours = durationMin / 60;
  const expectedSpeedKmh =
    hours > 0 && distanceM > 0 ? distanceM / 1000 / hours : 0;
  return [
    {
      index: 0,
      durationMin,
      distanceM,
      expectedSpeedKmh: Math.round(expectedSpeedKmh * 10) / 10,
      startLat: input.startLat,
      startLon: input.startLon,
      endLat: input.endLat,
      endLon: input.endLon,
    },
  ];
}

export function durationWeightedSpeedKmh(
  segments: Array<{ durationMin: number; expectedSpeedKmh: number }>,
): number {
  const total = segments.reduce((s, x) => s + x.durationMin, 0);
  if (total <= 0) return 0;
  return (
    segments.reduce((s, x) => s + x.expectedSpeedKmh * x.durationMin, 0) /
    total
  );
}

/**
 * Deterministic weather↔travel association (v1).
 *
 * Travel segments drive duration/speed. Each travel segment is paired with a
 * weather sample by cumulative duration fraction along the weather timeline
 * (evenly spaced weather samples map to [0,1] progress). Replaceable later
 * with geometry-based sampling without changing the exposure engine.
 */
export function associateWeatherIndex(
  travelIndex: number,
  travelCount: number,
  weatherCount: number,
): number {
  if (weatherCount <= 0) return 0;
  if (travelCount <= 1) return 0;
  const frac = travelIndex / (travelCount - 1);
  return Math.min(
    weatherCount - 1,
    Math.max(0, Math.round(frac * (weatherCount - 1))),
  );
}
