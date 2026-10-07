import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ResortDirectoryUnavailableError,
  type ResortDirectoryPort,
  type SkiResortHit,
} from './resort.types';

export const FNUGG_API_BASE_URL = 'https://api.fnugg.no';

/** Official public site named by the Fnugg API terms. */
export const FNUGG_PUBLIC_ORIGIN = 'https://fnugg.no';

/** Documented default search radius, passed explicitly so the bound is ours. */
export const FNUGG_NEARBY_RADIUS_KM = 50;

/**
 * Fields the clothing planner needs. Weather, lifts, and copy stay out.
 * `site_path` is the documented resort-page path used only for attribution.
 */
export const FNUGG_RESORT_SOURCE_FIELDS =
  'id,name,location.lat,location.lon,site_path';

/** Documented `site_path` values look like `/trysil/` or `/oslo-vinterpark/`. */
const FNUGG_SITE_PATH = /^\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;

/**
 * Builds the public resort page from Fnugg's `site_path`.
 * Rejects anything that is not a single relative slug.
 */
export function fnuggResortPageUrl(sitePath: unknown): string | null {
  if (typeof sitePath !== 'string') return null;
  const path = sitePath.trim();
  if (!FNUGG_SITE_PATH.test(path)) return null;
  return `${FNUGG_PUBLIC_ORIGIN}${path}`;
}

const NEARBY_RESULT_LIMIT = 20;
const logger = new Logger('FnuggResortAdapter');

export type ResortHttpResponse = {
  status: number;
  data: unknown;
};

export type ResortHttpGet = (
  url: string,
  headers: Record<string, string>,
) => Promise<ResortHttpResponse>;

const timeoutMs = 8_000;

const fnuggGet: ResortHttpGet = async (url, headers) => {
  const res = await axios.get(url, {
    headers,
    timeout: timeoutMs,
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
};

/**
 * Fnugg v1 adapter. Name search uses `/search` because autocomplete does not
 * return coordinates. Nearby uses `/geodata/getnearest` with a bounded radius.
 * Straight-line `sort` meters are not driving distance.
 */
export class FnuggResortAdapter implements ResortDirectoryPort {
  private readonly baseUrl: string;
  private readonly get: ResortHttpGet;

  constructor(options?: { baseUrl?: string | null; get?: ResortHttpGet }) {
    const configured = options?.baseUrl?.trim();
    this.baseUrl = (
      configured && configured.length > 0 ? configured : FNUGG_API_BASE_URL
    ).replace(/\/$/, '');
    this.get = options?.get ?? fnuggGet;
  }

  async searchByName(query: string): Promise<SkiResortHit[]> {
    const q = query.trim().slice(0, 80);
    if (q.length < 1) return [];
    // `/search` matches the provider's resort name. A town the index does not
    // list, including Kongsberg in the live index, stays an empty result.
    // Nearby resorts are not substituted, and no resort record is invented.
    const params = new URLSearchParams({
      type: 'resort',
      q,
      size: '10',
      sourceFields: FNUGG_RESORT_SOURCE_FIELDS,
    });
    const data = await this.request(
      `${this.baseUrl}/search?${params.toString()}`,
    );
    return mapFnuggHits(data, false).slice(0, 10);
  }

  async nearby(lat: number, lon: number): Promise<SkiResortHit[]> {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      distance: String(FNUGG_NEARBY_RADIUS_KM),
      sourceFields: FNUGG_RESORT_SOURCE_FIELDS,
    });
    const data = await this.request(
      `${this.baseUrl}/geodata/getnearest?${params.toString()}`,
    );
    return mapFnuggHits(data, true).slice(0, NEARBY_RESULT_LIMIT);
  }

  private async request(url: string): Promise<unknown> {
    try {
      const res = await this.get(url, {
        Accept: 'application/json',
        'User-Agent': 'RideWear/1.0 (alpine resort discovery)',
      });
      if (res.status < 200 || res.status >= 300) {
        logger.warn(`resort directory failed (status ${res.status})`);
        throw new ResortDirectoryUnavailableError();
      }
      if (isProviderError(res.data)) {
        logger.warn('resort directory failed (provider error)');
        throw new ResortDirectoryUnavailableError();
      }
      return res.data;
    } catch (err) {
      if (err instanceof ResortDirectoryUnavailableError) throw err;
      logger.warn('resort directory failed (status network)');
      throw new ResortDirectoryUnavailableError();
    }
  }
}

export function mapFnuggHits(
  data: unknown,
  withDistance: boolean,
): SkiResortHit[] {
  const hits = hitsOf(data);
  const resorts: SkiResortHit[] = [];
  for (const hit of hits) {
    const mapped = mapFnuggHit(hit, withDistance);
    if (mapped) resorts.push(mapped);
  }
  return resorts;
}

function hitsOf(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];
  const hits = (data as { hits?: { hits?: unknown } }).hits?.hits;
  return Array.isArray(hits) ? hits : [];
}

function mapFnuggHit(hit: unknown, withDistance: boolean): SkiResortHit | null {
  if (!hit || typeof hit !== 'object') return null;
  const record = hit as {
    _id?: unknown;
    _source?: {
      id?: unknown;
      name?: unknown;
      site_path?: unknown;
      location?: { lat?: unknown; lon?: unknown };
    };
    sort?: unknown;
  };
  const source = record._source;
  const name = typeof source?.name === 'string' ? source.name.trim() : '';
  const idValue = source?.id ?? record._id;
  const id =
    typeof idValue === 'number' || typeof idValue === 'string'
      ? String(idValue).trim()
      : '';
  const lat = source?.location?.lat;
  const lon = source?.location?.lon;
  if (!name || !id || typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  let straightLineDistanceM: number | null = null;
  if (withDistance && Array.isArray(record.sort)) {
    const meters = Number(record.sort[0]);
    if (Number.isFinite(meters) && meters >= 0) {
      straightLineDistanceM = Math.round(meters);
    }
  }

  return {
    id,
    name,
    lat,
    lon,
    straightLineDistanceM,
    sourceUrl: fnuggResortPageUrl(source?.site_path),
  };
}

function isProviderError(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  return 'error' in data && !('hits' in data);
}
