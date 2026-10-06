import { Logger } from '@nestjs/common';
import {
  TRAIL_NEARBY_RADIUS_M,
  mapGeonorgeSkiTrails,
} from './geonorge-trail.adapter';
import {
  TrailDirectoryUnavailableError,
  type SkiTrailHit,
  type TrailDirectoryPort,
} from './trail.types';

/**
 * Process-local cache in front of the official Turrutebasen WFS.
 *
 * Verified 2026-10-02 from Geonorge metadata
 * d1422d17-6d95-4ef1-96ab-8af31744dd63:
 * - WFS `https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter`, feature
 *   type `app:Skiløype`.
 * - ATOM feeds and the Geonorge download API also exist. They deliver
 *   county or national files (FGDB, GML, GPX, PostGIS, SOSI).
 * - Maintenance is weekly. `DateUpdated` was 2026-09-29.
 * - Access is open data and "No conditions apply to access and use".
 *   Responses still credit Kartverket.
 *
 * One bounded GetFeature around 59.98, 10.70 (about 8 km, count 80)
 * returned 67 features and 179035 bytes in 1.453 s, then 1.172 s on a
 * repeat. Measured with a single Python urllib GET, not by the test suite.
 * That is fast enough to keep the bounded query. This cache does not
 * download Norway and does not add a spatial database.
 *
 * A nearby request reads the last stored collection for its map cell and
 * filters it to the 8 km radius. Each cell is refreshed at most once per
 * 24 hours. The refresh does not block the request when a stored
 * collection exists. A failed refresh keeps that collection and logs its
 * age. The first request for a cell still performs one bounded query,
 * because there is no older collection to serve.
 */

/** Map cell. About 1.1 km of latitude, so nearby searches share one fetch. */
export const TRAIL_CACHE_CELL_DEG = 0.01;

/**
 * Fetch radius around the cell center. Covers an 8 km search from any
 * origin inside the cell, including Norway's southern longitude scale.
 */
export const TRAIL_CELL_FETCH_RADIUS_M = 9_000;

/** Do not ask Geonorge whether a cell changed more often than this. */
export const TRAIL_SOURCE_REFRESH_MS = 24 * 60 * 60 * 1000;

const TRAIL_CACHE_MAX_CELLS = 32;

export type TrailCollectionSource = {
  fetchFeatureCollection(
    lat: number,
    lon: number,
    radiusM: number,
  ): Promise<string>;
};

export type TrailCacheLogger = {
  warn(message: string): void;
};

type StoredCollection = {
  xml: string;
  fetchedAt: number;
  checkedAt: number;
};

export function trailCacheCell(
  lat: number,
  lon: number,
): { key: string; lat: number; lon: number } {
  const latRounded = snapDegree(lat);
  const lonRounded = snapDegree(lon);
  return {
    key: `${latRounded.toFixed(2)},${lonRounded.toFixed(2)}`,
    lat: latRounded,
    lon: lonRounded,
  };
}

function snapDegree(value: number): number {
  const snapped =
    Math.round(value / TRAIL_CACHE_CELL_DEG) * TRAIL_CACHE_CELL_DEG;
  return Math.round(snapped * 100) / 100;
}

/**
 * Small process-local map. Failed refreshes are not stored as empty
 * collections, so a cold outage can be retried.
 */
export class TrailCollectionCache {
  private readonly entries = new Map<string, StoredCollection>();

  constructor(private readonly maxEntries = TRAIL_CACHE_MAX_CELLS) {}

  get(key: string): StoredCollection | undefined {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: string, entry: StoredCollection): void {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      const next = this.entries.keys().next();
      if (next.done === true || typeof next.value !== 'string') break;
      this.entries.delete(next.value);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export class CachingTrailDirectory implements TrailDirectoryPort {
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly cache: TrailCollectionCache;
  private readonly now: () => number;
  private readonly refreshIntervalMs: number;
  private readonly fetchRadiusM: number;
  private readonly logger: TrailCacheLogger;

  constructor(
    private readonly source: TrailCollectionSource,
    cache?: TrailCollectionCache,
    options?: {
      now?: () => number;
      refreshIntervalMs?: number;
      fetchRadiusM?: number;
      logger?: TrailCacheLogger;
    },
  ) {
    this.cache = cache ?? new TrailCollectionCache();
    this.now = options?.now ?? Date.now;
    this.refreshIntervalMs =
      options?.refreshIntervalMs ?? TRAIL_SOURCE_REFRESH_MS;
    this.fetchRadiusM = options?.fetchRadiusM ?? TRAIL_CELL_FETCH_RADIUS_M;
    this.logger = options?.logger ?? new Logger('CachingTrailDirectory');
  }

  async nearby(lat: number, lon: number): Promise<SkiTrailHit[]> {
    if (!isQueryableCoordinate(lat, lon)) return [];
    const cell = trailCacheCell(lat, lon);
    const stored = this.cache.get(cell.key);
    if (stored && !this.isDue(stored)) {
      return this.filter(stored.xml, lat, lon);
    }
    if (stored) {
      void this.refresh(cell, false);
      return this.filter(stored.xml, lat, lon);
    }
    await this.refresh(cell, true);
    const loaded = this.cache.get(cell.key);
    if (!loaded) throw new TrailDirectoryUnavailableError();
    return this.filter(loaded.xml, lat, lon);
  }

  private isDue(stored: StoredCollection): boolean {
    return this.now() - stored.checkedAt >= this.refreshIntervalMs;
  }

  private filter(xml: string, lat: number, lon: number): SkiTrailHit[] {
    return mapGeonorgeSkiTrails(xml, { lat, lon }, TRAIL_NEARBY_RADIUS_M);
  }

  private refresh(
    cell: { key: string; lat: number; lon: number },
    wait: boolean,
  ): Promise<void> | undefined {
    const existing = this.inFlight.get(cell.key);
    if (existing) return wait ? existing : undefined;
    const job = this.load(cell).finally(() => {
      this.inFlight.delete(cell.key);
    });
    this.inFlight.set(cell.key, job);
    if (!wait) {
      void job.catch(() => undefined);
      return undefined;
    }
    return job;
  }

  private async load(cell: {
    key: string;
    lat: number;
    lon: number;
  }): Promise<void> {
    try {
      const xml = await this.source.fetchFeatureCollection(
        cell.lat,
        cell.lon,
        this.fetchRadiusM,
      );
      const fetchedAt = this.now();
      this.cache.set(cell.key, {
        xml,
        fetchedAt,
        checkedAt: fetchedAt,
      });
    } catch (err) {
      const existing = this.cache.get(cell.key);
      if (existing) {
        const checkedAt = this.now();
        const ageMs = checkedAt - existing.fetchedAt;
        existing.checkedAt = checkedAt;
        this.logger.warn(
          `Ski trail refresh failed; serving last known good fetched at ${new Date(existing.fetchedAt).toISOString()} (${ageMs}ms old)`,
        );
        return;
      }
      if (err instanceof TrailDirectoryUnavailableError) throw err;
      throw new TrailDirectoryUnavailableError();
    }
  }
}

function isQueryableCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
