import type {
  ElevationLookup,
  ElevationPort,
  GroundPoint,
} from './elevation.port';

/** Used when elevation is disabled or no adapter is configured. */
export class NullElevationAdapter implements ElevationPort {
  async groundElevations(points: GroundPoint[]): Promise<ElevationLookup> {
    return {
      provider: 'none',
      attribution: null,
      points: points.map((point) => ({
        lat: point.lat,
        lon: point.lon,
        elevationM: null,
      })),
    };
  }
}
