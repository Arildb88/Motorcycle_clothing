import axios from 'axios';
import type {
  ElevationLookup,
  ElevationPort,
  GroundPoint,
} from './elevation.port';

/** Kartverket `/punkt` accepts at most 50 coordinates per request. */
export const KARTVERKET_MAX_POINTS = 50;

/** EPSG:4258 — geographic lat/lon, the CRS the elevation API documents for nord/ost. */
export const KARTVERKET_GEOGRAPHIC_SRID = 4258;

export const KARTVERKET_ELEVATION_ATTRIBUTION = '© Kartverket';

const DEFAULT_BASE_URL = 'https://ws.geonorge.no/hoydedata/v1';

export type ElevationHttpGet = (
  url: string,
) => Promise<{ status: number; data: unknown }>;

/**
 * Small process-local cache. Terrain does not change between recommendations.
 * Null results are not stored, so a failed call can be retried.
 */
export class BoundedElevationCache {
  private readonly entries = new Map<string, number>();

  constructor(private readonly maxEntries = 500) {}

  get(key: string): number | undefined {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: string, elevationM: number): void {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, elevationM);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export function elevationCacheKey(point: GroundPoint): string {
  return `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
}

export function chunkPoints<T>(points: T[], size: number): T[][] {
  const chunks: T[][] = [];
  const step = Math.max(1, size);
  for (let index = 0; index < points.length; index += step) {
    chunks.push(points.slice(index, index + step));
  }
  return chunks;
}

/**
 * Read z values in request order. A mismatched body yields nulls rather than
 * attaching the wrong height to a sample.
 */
export function elevationsFromKartverketBody(
  requestedCount: number,
  body: unknown,
): Array<number | null> {
  const empty = Array.from({ length: requestedCount }, () => null);
  if (!body || typeof body !== 'object') return empty;
  const punkter = (body as { punkter?: unknown }).punkter;
  if (!Array.isArray(punkter) || punkter.length !== requestedCount)
    return empty;
  return punkter.map((entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const z = (entry as { z?: unknown }).z;
    if (typeof z !== 'number' || !Number.isFinite(z)) return null;
    return Math.round(z);
  });
}

export function kartverketPunktUrl(
  baseUrl: string,
  points: GroundPoint[],
): string {
  const pairs = points.map((point) => [
    Number(point.lon.toFixed(5)),
    Number(point.lat.toFixed(5)),
  ]);
  const root = baseUrl.replace(/\/$/, '');
  const query = new URLSearchParams({
    koordsys: String(KARTVERKET_GEOGRAPHIC_SRID),
    punkter: JSON.stringify(pairs),
  });
  return `${root}/punkt?${query.toString()}`;
}

/**
 * Kartverket open elevation API (CC BY 4.0).
 * One request covers up to 50 sample points. Callers should pass weather
 * samples, not every vertex of a road line.
 */
export class KartverketElevationAdapter implements ElevationPort {
  private readonly baseUrl: string;
  private readonly get: ElevationHttpGet;
  private readonly cache: BoundedElevationCache;

  constructor(options?: {
    baseUrl?: string | null;
    get?: ElevationHttpGet;
    cache?: BoundedElevationCache;
  }) {
    this.baseUrl =
      (options?.baseUrl ?? DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;
    this.get = options?.get ?? defaultGet;
    this.cache = options?.cache ?? new BoundedElevationCache();
  }

  async groundElevations(points: GroundPoint[]): Promise<ElevationLookup> {
    const elevations: Array<number | null> = points.map(() => null);
    const missing: Array<GroundPoint & { index: number }> = [];

    points.forEach((point, index) => {
      if (!isFinitePoint(point)) return;
      const cached = this.cache.get(elevationCacheKey(point));
      if (cached === undefined) {
        missing.push({ ...point, index });
        return;
      }
      elevations[index] = cached;
    });

    for (const chunk of chunkPoints(missing, KARTVERKET_MAX_POINTS)) {
      try {
        const url = kartverketPunktUrl(this.baseUrl, chunk);
        const response = await this.get(url);
        if (response.status < 200 || response.status >= 300) continue;
        const heights = elevationsFromKartverketBody(
          chunk.length,
          response.data,
        );
        chunk.forEach((point, index) => {
          const height = heights[index];
          elevations[point.index] = height;
          if (height != null) this.cache.set(elevationCacheKey(point), height);
        });
      } catch {
        // Leave this chunk unknown. Weather continues without altitude.
      }
    }

    const any = elevations.some((height) => height != null);
    return {
      provider: any ? 'kartverket' : 'none',
      attribution: any ? KARTVERKET_ELEVATION_ATTRIBUTION : null,
      points: points.map((point, index) => ({
        lat: point.lat,
        lon: point.lon,
        elevationM: elevations[index],
      })),
    };
  }
}

function isFinitePoint(point: GroundPoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon);
}

async function defaultGet(
  url: string,
): Promise<{ status: number; data: unknown }> {
  const response = await axios.get(url, {
    timeout: 8000,
    headers: { Accept: 'application/json' },
    validateStatus: () => true,
  });
  return { status: response.status, data: response.data };
}
