/** One published vertex from a ski-trail centerline. */
export type SkiTrailPoint = {
  lat: number;
  lon: number;
};

/**
 * Provider-neutral ski trail. The line is a subset of published vertices.
 * It is not a generated route and it does not include grooming status.
 */
export type SkiTrailHit = {
  id: string;
  name: string;
  /** Nearest published vertex to the nearby origin. */
  lat: number;
  lon: number;
  /** Straight-line meters from the origin to that vertex. */
  straightLineDistanceM: number;
  line: SkiTrailPoint[];
};

export type TrailDirectoryPort = {
  nearby(lat: number, lon: number): Promise<SkiTrailHit[]>;
};

export const TRAIL_DIRECTORY = Symbol('TRAIL_DIRECTORY');

export const TRAIL_ATTRIBUTION = 'Kartverket';

export type TrailDiscoveryResponse = {
  attribution: typeof TRAIL_ATTRIBUTION;
  distanceKind: 'straight_line';
  trails: SkiTrailHit[];
};

export class TrailDirectoryUnavailableError extends Error {
  constructor() {
    super('trail_directory_unavailable');
    this.name = 'TrailDirectoryUnavailableError';
  }
}
