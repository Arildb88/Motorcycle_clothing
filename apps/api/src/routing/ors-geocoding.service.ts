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
  constructor(readonly reason: 'not_configured' | 'provider') {
    super(reason);
    this.name = 'GeocodingUnavailableError';
  }
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
    this.assertConfigured();
    const query = text.trim().slice(0, 200);
    if (query.length < 2) return [];

    const url = `${this.baseUrl}/autocomplete?text=${encodeURIComponent(query)}&size=8`;
    const data = await this.request(url);
    return featuresOf(data)
      .map(mapFeature)
      .filter((place): place is GeocodedPlace => place != null)
      .slice(0, 8);
  }

  async resolve(providerPlaceId: string): Promise<GeocodedPlace | null> {
    this.assertConfigured();
    const id = providerPlaceId.trim();
    if (!id) return null;
    const url = `${this.baseUrl}/place?ids=${encodeURIComponent(id)}`;
    const data = await this.request(url);
    const place = featuresOf(data).map(mapFeature).find((hit) => hit != null);
    return place ?? null;
  }

  private assertConfigured() {
    if (!this.isConfigured) {
      throw new GeocodingUnavailableError('not_configured');
    }
  }

  private async request(url: string): Promise<unknown> {
    try {
      const res = await this.get(url, orsAuthHeaders(this.apiKey));
      if (res.status < 200 || res.status >= 300) {
        logger.warn(`geocoding failed (status ${res.status})`);
        throw new GeocodingUnavailableError('provider');
      }
      return res.data;
    } catch (err) {
      if (err instanceof GeocodingUnavailableError) throw err;
      logger.warn('geocoding failed (status network)');
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
  const label = stringProp(props.label) ?? name;
  if (!gid || !label) return null;
  const primary = name ?? label;
  return {
    providerPlaceId: gid,
    primaryText: primary,
    secondaryText: secondaryFromLabel(primary, label),
    label: primary,
    lat,
    lon,
    address: label,
  };
}

function featuresOf(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];
  const features = (data as { features?: unknown }).features;
  return Array.isArray(features) ? features : [];
}

function secondaryFromLabel(name: string, label: string): string | null {
  if (!label || label === name) return null;
  const prefix = `${name}, `;
  if (label.startsWith(prefix)) {
    const rest = label.slice(prefix.length).trim();
    return rest || null;
  }
  return label;
}

function stringProp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
