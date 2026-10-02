/**
 * Provider-neutral ground elevation.
 *
 * Activity code asks for metres above sea level at sample coordinates.
 * It does not import Kartverket or any other elevation vendor.
 */

export type GroundPoint = {
  lat: number;
  lon: number;
};

export type GroundElevation = GroundPoint & {
  /** Whole metres above sea level, or null when the lookup did not return one. */
  elevationM: number | null;
};

export type ElevationLookup = {
  /** `none` when no height was obtained. */
  provider: string;
  /** Credit line when a source actually returned heights. */
  attribution: string | null;
  points: GroundElevation[];
};

export interface ElevationPort {
  groundElevations(points: GroundPoint[]): Promise<ElevationLookup>;
}

export const ELEVATION_PORT = Symbol('ELEVATION_PORT');
