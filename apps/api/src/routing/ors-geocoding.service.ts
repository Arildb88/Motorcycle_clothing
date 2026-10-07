import { Logger } from '@nestjs/common';
import { HEIGIT_PELIAS_BASE_URL, resolvePeliasBaseUrl } from './ors.constants';
import { orsAuthHeaders, orsGet, type OrsHttpGet } from './ors.http';

const logger = new Logger('OrsGeocodingService');

export type GeocodedPlace = {
  providerPlaceId: string;
  primaryText: string;
  secondaryText: string | null;
  label: string;
  lat: number;
  lon: number;
  address: string | null;
};

export class GeocodingUnavailableError extends Error {
  constructor(
    readonly reason: 'not_configured' | 'authentication' | 'provider' | 'not_found',
  ) {
    super(reason);
    this.name = 'GeocodingUnavailableError';
  }
}

export type GeocodingOperation = 'autocomplete' | 'resolve';

/** Autocomplete hit returned to the app. Coordinates stay on this payload. */
export function placeSearchHit(hit: GeocodedPlace) {
  return {
    providerPlaceId: hit.providerPlaceId,
    primaryText: hit.primaryText,
    secondaryText: hit.secondaryText,
    label: hit.label,
    lat: hit.lat,
    lon: hit.lon,
    address: hit.address,
  };
}

/**
 * Pelias autocomplete + place lookup on HeiGIT.
 * The API key is sent only as a request header and is never logged.
 */
export class OrsGeocodingService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly get: OrsHttpGet;

  constructor(options: {
    apiKey: string;
    baseUrl?: string | null;
    get?: OrsHttpGet;
  }) {
    this.apiKey = options.apiKey.trim();
    this.baseUrl = resolvePeliasBaseUrl(options.baseUrl ?? HEIGIT_PELIAS_BASE_URL);
    this.get = options.get ?? orsGet;
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async autocomplete(text: string): Promise<GeocodedPlace[]> {
    this.assertConfigured('autocomplete');
    const query = text.trim().slice(0, 200);
    if (query.length < 2) return [];

    const url = `${this.baseUrl}/autocomplete?text=${encodeURIComponent(query)}&size=8`;
    const data = await this.request(url, 'autocomplete');
    return featuresOf(data)
      .map(mapFeature)
      .filter((place): place is GeocodedPlace => place != null)
      .slice(0, 8);
  }

  async resolve(providerPlaceId: string): Promise<GeocodedPlace | null> {
    this.assertConfigured('resolve');
    const id = providerPlaceId.trim();
    if (!id) return null;
    // HeiGIT does not route Pelias `/place` (nginx HTML 404). That status is
    // not a temporary outage. Selection uses autocomplete coordinates instead.
    const url = `${this.baseUrl}/place?ids=${encodeURIComponent(id)}`;
    const data = await this.request(url, 'resolve');
    const place = featuresOf(data).map(mapFeature).find((hit) => hit != null);
    if (!place) {
      logger.warn('resolve failed (status 200 empty)');
      return null;
    }
    return place;
  }

  private assertConfigured(operation: GeocodingOperation) {
    if (!this.isConfigured) {
      logger.warn(`${operation} failed (status not_configured)`);
      throw new GeocodingUnavailableError('not_configured');
    }
  }

  private async request(url: string, operation: GeocodingOperation): Promise<unknown> {
    try {
      const res = await this.get(url, orsAuthHeaders(this.apiKey));
      if (res.status === 401 || res.status === 403) {
        logger.warn(`${operation} failed (status ${res.status} authentication)`);
        throw new GeocodingUnavailableError('authentication');
      }
      if (operation === 'resolve' && res.status === 404) {
        logger.warn('resolve failed (status 404)');
        throw new GeocodingUnavailableError('not_found');
      }
      if (res.status < 200 || res.status >= 300) {
        logger.warn(`${operation} failed (status ${res.status})`);
        throw new GeocodingUnavailableError('provider');
      }
      return res.data;
    } catch (err) {
      if (err instanceof GeocodingUnavailableError) throw err;
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT';
      logger.warn(`${operation} failed (status ${timedOut ? 'timeout' : 'network'})`);
      throw new GeocodingUnavailableError('provider');
    }
  }
}

export function mapFeature(feature: unknown): GeocodedPlace | null {
  if (!feature || typeof feature !== 'object') return null;
  const record = feature as {
    geometry?: { type?: string; coordinates?: unknown[] };
    properties?: Record<string, unknown>;
  };
  const coordinates = record.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lon = coordinates[0];
  const lat = coordinates[1];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const props = record.properties ?? {};
  const gid = stringProp(props.gid) ?? stringProp(props.id);
  const name = stringProp(props.name);
  const peliasLabel = stringProp(props.label);
  const texts = placeTexts(name, peliasLabel);
  if (!gid || !texts) return null;
  return {
    providerPlaceId: gid,
    primaryText: texts.primaryText,
    secondaryText: texts.secondaryText,
    label: texts.label,
    lat,
    lon,
    address: peliasLabel ?? texts.label,
  };
}

function featuresOf(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];
  const features = (data as { features?: unknown }).features;
  return Array.isArray(features) ? features : [];
}

/**
 * Pelias `name` is often only the locality. The selected field must keep the
 * meaningful `label` (for example "Kristiansand lufthavn, Kjevik") instead of
 * collapsing to that short name.
 */
export function placeTexts(
  name: string | null,
  peliasLabel: string | null,
): { primaryText: string; secondaryText: string | null; label: string } | null {
  const full = peliasLabel ?? name;
  if (!full) return null;
  if (!name || name === full) {
    return { primaryText: full, secondaryText: null, label: full };
  }
  const prefix = `${name}, `;
  if (full.startsWith(prefix)) {
    const rest = full.slice(prefix.length).trim();
    return {
      primaryText: name,
      secondaryText: rest.length > 0 ? rest : null,
      label: full,
    };
  }
  return { primaryText: full, secondaryText: null, label: full };
}

function stringProp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
