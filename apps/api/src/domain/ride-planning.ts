/**
 * Ride planning domain foundation (provider-neutral).
 *
 * Product boundary:
 * - RideWear plans & analyzes rides for weather, exposure, and clothing.
 * - External navigation apps handle turn-by-turn guidance after handoff.
 *
 * Language-neutral enums only — Flutter localizes display strings.
 */

/** How the rider anchors the plan clock. */
export const PLANNING_MODES = ['departure', 'arrival'] as const;
export type PlanningMode = (typeof PLANNING_MODES)[number];

export function isPlanningMode(value: unknown): value is PlanningMode {
  return (
    typeof value === 'string' &&
    (PLANNING_MODES as readonly string[]).includes(value)
  );
}

/**
 * Provider-neutral routing preferences stored on Route (reusable template).
 * Keep intentionally small — do not mirror every provider option.
 */
export type RoutePreferences = {
  avoidMotorways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
};

export const DEFAULT_ROUTE_PREFERENCES: Readonly<RoutePreferences> = {
  avoidMotorways: false,
  avoidTolls: false,
  avoidFerries: false,
};

/** Parse preferences JSON; unknown keys ignored; missing → defaults. */
export function parseRoutePreferences(
  raw: string | null | undefined | RoutePreferences,
): RoutePreferences {
  if (raw == null || raw === '') {
    return { ...DEFAULT_ROUTE_PREFERENCES };
  }
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_ROUTE_PREFERENCES };
    }
  }
  if (!obj || typeof obj !== 'object') {
    return { ...DEFAULT_ROUTE_PREFERENCES };
  }
  const o = obj as Record<string, unknown>;
  return {
    avoidMotorways: o.avoidMotorways === true,
    avoidTolls: o.avoidTolls === true,
    avoidFerries: o.avoidFerries === true,
  };
}

export function serializeRoutePreferences(
  prefs: RoutePreferences | null | undefined,
): string {
  const p = parseRoutePreferences(prefs ?? {});
  return JSON.stringify({
    avoidMotorways: p.avoidMotorways === true,
    avoidTolls: p.avoidTolls === true,
    avoidFerries: p.avoidFerries === true,
  });
}

/**
 * Resolve departure/arrival given planning mode + duration.
 * Arrival mode: departureAt = arrivalAt − durationMin.
 * Departure mode: arrivalAt = departureAt + durationMin (when duration known).
 */
export function resolvePlanSchedule(input: {
  planningMode: PlanningMode;
  departureAt?: Date | null;
  arrivalAt?: Date | null;
  durationMin: number;
  /** Clock used when the anchoring time is omitted (usually "now"). */
  now?: Date;
}): {
  planningMode: PlanningMode;
  departureAt: Date;
  arrivalAt: Date;
  durationMin: number;
} {
  const durationMin = Math.max(1, Math.round(input.durationMin));
  const now = input.now ?? new Date();

  if (input.planningMode === 'arrival') {
    const arrivalAt = input.arrivalAt ?? now;
    const departureAt = new Date(arrivalAt.getTime() - durationMin * 60_000);
    return { planningMode: 'arrival', departureAt, arrivalAt, durationMin };
  }

  const departureAt = input.departureAt ?? now;
  const arrivalAt = new Date(departureAt.getTime() + durationMin * 60_000);
  return { planningMode: 'departure', departureAt, arrivalAt, durationMin };
}

/**
 * Waypoint roles are derived from ordered position when unset:
 * index 0 → start, last → end, middle → stop.
 * Round trips (`routeKind=loop`): last waypoint is near the first; we keep
 * both coordinates so ordering stays explicit (no phantom return node).
 */
export function deriveWaypointRole(
  index: number,
  total: number,
): 'start' | 'stop' | 'end' {
  if (index === 0) return 'start';
  if (index === total - 1) return 'end';
  return 'stop';
}

/** Origin may be "use current location" only at plan time — never auto-tracked. */
export type PlanOriginSource = 'saved_waypoint' | 'current_location' | 'manual';

/**
 * Frozen route definition on ActivityPlan.snapshotJson.
 * Compatible with existing v1 snapshots written by RoutesService.planFromRoute.
 */
export type RoutePlanSnapshotV1 = {
  version: 1;
  source: 'saved_route';
  savedRouteId: string;
  name: string;
  description?: string | null;
  activityType: string;
  routeKind: string;
  category?: string | null;
  typicalDurationMin: number;
  waypoints: Array<{
    sortOrder: number;
    lat: number;
    lon: number;
    label?: string | null;
    address?: string | null;
    waypointType?: string | null;
  }>;
  startLat: number;
  startLon: number;
  startLabel?: string | null;
  endLat: number;
  endLon: number;
  endLabel?: string | null;
  snappedAt: string;
};

export type RoutePlanSnapshotV2 = Omit<RoutePlanSnapshotV1, 'version'> & {
  version: 2;
  preferences: RoutePreferences;
  planningMode: PlanningMode;
  arrivalAt?: string | null;
  originSource?: PlanOriginSource;
};

export type RoutePlanSnapshot = RoutePlanSnapshotV1 | RoutePlanSnapshotV2;

/**
 * Accepts both the typed v1/v2 shape and older loosely-keyed snapshots.
 * Returns null only when JSON is unusable.
 */
export function parseRoutePlanSnapshot(
  raw: string | null | undefined,
): RoutePlanSnapshot | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (!obj || typeof obj !== 'object') return null;
    if (!Array.isArray(obj.waypoints)) return null;
    const version = obj.version === 2 ? 2 : 1;
    return { ...obj, version } as RoutePlanSnapshot;
  } catch {
    return null;
  }
}

/** Normalize any snapshot to v2 for consumers (legacy v1 → defaults). */
export function upgradeRoutePlanSnapshot(
  snap: RoutePlanSnapshot,
): RoutePlanSnapshotV2 {
  if (snap.version === 2) {
    return {
      ...snap,
      preferences: parseRoutePreferences(snap.preferences),
      planningMode: isPlanningMode(snap.planningMode)
        ? snap.planningMode
        : 'departure',
    };
  }
  return {
    ...snap,
    version: 2,
    preferences: { ...DEFAULT_ROUTE_PREFERENCES },
    planningMode: 'departure',
    arrivalAt: null,
  };
}
