import type {
  ElevationLookup,
  ElevationPort,
  GroundPoint,
} from './elevation.port';

/**
 * Ground heights for already-chosen weather samples.
 * A failed or incomplete lookup returns null heights and does not throw.
 */
export async function lookupSampleAltitudes(
  port: ElevationPort,
  points: GroundPoint[],
): Promise<ElevationLookup> {
  const unknown = emptyLookup(points);
  try {
    const lookup = await port.groundElevations(points);
    const aligned = points.map((point, index) => ({
      lat: point.lat,
      lon: point.lon,
      elevationM: finiteMetres(lookup?.points?.[index]?.elevationM),
    }));
    const any = aligned.some((point) => point.elevationM != null);
    return {
      provider: any ? (lookup.provider ?? 'none') : 'none',
      attribution: any ? (lookup.attribution ?? null) : null,
      points: aligned,
    };
  } catch {
    return unknown;
  }
}

function emptyLookup(points: GroundPoint[]): ElevationLookup {
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

function finiteMetres(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
