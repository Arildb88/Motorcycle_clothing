/** Provider-neutral ski resort. Weather stays on the RideWear weather port. */
export type SkiResortHit = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Straight-line meters from the nearby origin. Null for name search. */
  straightLineDistanceM: number | null;
  /**
   * Public Fnugg resort page when the source path is a single documented slug.
   * Null when Fnugg did not provide one. Never a weather or third-party URL.
   */
  sourceUrl: string | null;
};

export type ResortDirectoryPort = {
  searchByName(query: string): Promise<SkiResortHit[]>;
  nearby(lat: number, lon: number): Promise<SkiResortHit[]>;
};

export const RESORT_DIRECTORY = Symbol('RESORT_DIRECTORY');

export const RESORT_ATTRIBUTION = 'Fnugg.no';

export type ResortDiscoveryResponse = {
  attribution: typeof RESORT_ATTRIBUTION;
  distanceKind: 'straight_line';
  resorts: SkiResortHit[];
};

export class ResortDirectoryUnavailableError extends Error {
  constructor() {
    super('resort_directory_unavailable');
    this.name = 'ResortDirectoryUnavailableError';
  }
}
