import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  TrailDirectoryUnavailableError,
  type SkiTrailHit,
  type SkiTrailPoint,
  type TrailDirectoryPort,
} from './trail.types';

/**
 * Kartverket Turrutebasen WFS, feature type `app:Skiløype`.
 *
 * Verified 2026-10-02 against
 * https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter
 * and Geonorge metadata d1422d17-6d95-4ef1-96ab-8af31744dd63.
 * The service is open, needs no key, and the catalog license is
 * "No conditions apply to access and use". Kartverket's general terms
 * still ask for a Kartverket credit where the product is shown.
 *
 * Requested data is the local id, route name, and centerline. Preparation
 * codes are not grooming status and are not returned.
 *
 * Metadata checked again on 2026-10-02. The dataset also has ATOM feeds
 * and a Geonorge download order for county and national files. Those are
 * not used here. A bounded Skiløype query is the read path; `trail-cache.ts`
 * keeps that query off the interactive request when a stored cell exists.
 */
export const GEONORGE_TRAIL_WFS_URL =
  'https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter';

/** Straight-line search radius. The WFS bbox is only the coarse filter. */
export const TRAIL_NEARBY_RADIUS_M = 8_000;

const WFS_FEATURE_COUNT = 80;
const MAX_LINE_POINTS = 8;
const MAX_NAME_LENGTH = 80;
const RESULT_LIMIT = 20;
const logger = new Logger('GeonorgeTrailAdapter');

export type TrailHttpResponse = {
  status: number;
  data: unknown;
};

export type TrailHttpGet = (
  url: string,
  headers: Record<string, string>,
) => Promise<TrailHttpResponse>;

const timeoutMs = 8_000;

const geonorgeGet: TrailHttpGet = async (url, headers) => {
  const res = await axios.get<string>(url, {
    headers,
    timeout: timeoutMs,
    validateStatus: () => true,
    responseType: 'text',
    maxContentLength: 5_000_000,
    transformResponse: [(data: string) => data],
  });
  return { status: res.status, data: res.data };
};

export class GeonorgeTrailAdapter implements TrailDirectoryPort {
  private readonly baseUrl: string;
  private readonly get: TrailHttpGet;

  constructor(options?: { baseUrl?: string | null; get?: TrailHttpGet }) {
    const configured = options?.baseUrl?.trim();
    this.baseUrl = (
      configured && configured.length > 0 ? configured : GEONORGE_TRAIL_WFS_URL
    ).replace(/\/$/, '');
    this.get = options?.get ?? geonorgeGet;
  }

  async nearby(lat: number, lon: number): Promise<SkiTrailHit[]> {
    if (!isQueryableCoordinate(lat, lon)) return [];
    const data = await this.fetchFeatureCollection(
      lat,
      lon,
      TRAIL_NEARBY_RADIUS_M,
    );
    return mapGeonorgeSkiTrails(data, { lat, lon }, TRAIL_NEARBY_RADIUS_M);
  }

  /**
   * One bounded Skiløype GetFeature. Callers that already have a stored
   * collection should not wait on this.
   */
  async fetchFeatureCollection(
    lat: number,
    lon: number,
    radiusM: number,
  ): Promise<string> {
    if (!isQueryableCoordinate(lat, lon) || !Number.isFinite(radiusM)) {
      throw new TrailDirectoryUnavailableError();
    }
    if (radiusM <= 0) throw new TrailDirectoryUnavailableError();
    return this.request(this.featureCollectionUrl(lat, lon, radiusM));
  }

  nearbyUrl(lat: number, lon: number): string {
    return this.featureCollectionUrl(lat, lon, TRAIL_NEARBY_RADIUS_M);
  }

  featureCollectionUrl(lat: number, lon: number, radiusM: number): string {
    const box = bboxAround(lat, lon, radiusM);
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: 'app:Skiløype',
      count: String(WFS_FEATURE_COUNT),
      srsName: 'urn:ogc:def:crs:EPSG::4326',
      BBOX: `${box.minLat},${box.minLon},${box.maxLat},${box.maxLon},urn:ogc:def:crs:EPSG::4326`,
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  private async request(url: string): Promise<string> {
    try {
      const res = await this.get(url, {
        Accept: 'application/gml+xml, text/xml',
        'User-Agent': 'RideWear/1.0 (cross-country trail discovery)',
      });
      if (res.status < 200 || res.status >= 300) {
        logger.warn(`trail directory failed (status ${res.status})`);
        throw new TrailDirectoryUnavailableError();
      }
      if (typeof res.data !== 'string' || isGeonorgeException(res.data)) {
        logger.warn('trail directory failed (provider error)');
        throw new TrailDirectoryUnavailableError();
      }
      return res.data;
    } catch (err) {
      if (err instanceof TrailDirectoryUnavailableError) throw err;
      logger.warn('trail directory failed (status network)');
      throw new TrailDirectoryUnavailableError();
    }
  }
}

export function isGeonorgeException(xml: string): boolean {
  return xml.includes('ExceptionReport');
}

/**
 * Maps a WFS FeatureCollection. EPSG:4326 positions are latitude then
 * longitude. Features outside the radius, without a name, or without a
 * centerline are dropped. Nothing is invented to fill a gap.
 */
export function mapGeonorgeSkiTrails(
  xml: string,
  origin: { lat: number; lon: number },
  radiusM: number,
): SkiTrailHit[] {
  if (!xml.includes('FeatureCollection')) return [];
  const byId = new Map<string, SkiTrailHit>();
  for (const member of xml.split('<wfs:member>').slice(1)) {
    const block = member.split('</wfs:member>')[0] ?? '';
    const hit = mapMember(block, origin, radiusM);
    if (!hit) continue;
    const existing = byId.get(hit.id);
    if (
      !existing ||
      hit.straightLineDistanceM < existing.straightLineDistanceM
    ) {
      byId.set(hit.id, hit);
    }
  }
  return [...byId.values()]
    .sort((a, b) => {
      if (a.straightLineDistanceM !== b.straightLineDistanceM) {
        return a.straightLineDistanceM - b.straightLineDistanceM;
      }
      return a.name.localeCompare(b.name, 'nb');
    })
    .slice(0, RESULT_LIMIT);
}

function mapMember(
  block: string,
  origin: { lat: number; lon: number },
  radiusM: number,
): SkiTrailHit | null {
  const id = firstText(block, 'lokalId').trim();
  const name = decodeXml(firstText(block, 'rutenavn'))
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  if (!id || !name) return null;
  const points =
    block
      .match(
        /<(?:[\w.-]+:)?posList(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?posList>/g,
      )
      ?.flatMap((tag) => parsePosList(tag.replace(/<[^>]+>/g, ''))) ?? [];
  if (points.length < 2) return null;

  let nearest = 0;
  let nearestM = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const meters = haversineM(
      origin.lat,
      origin.lon,
      points[i].lat,
      points[i].lon,
    );
    if (meters < nearestM) {
      nearest = i;
      nearestM = meters;
    }
  }
  if (!Number.isFinite(nearestM) || nearestM > radiusM) return null;

  const line = downsample(points, nearest).map(roundPoint);
  const anchor = roundPoint(points[nearest]);
  return {
    id,
    name,
    lat: anchor.lat,
    lon: anchor.lon,
    straightLineDistanceM: Math.round(nearestM),
    line,
  };
}

function firstText(block: string, localName: string): string {
  const match = block.match(
    new RegExp(
      `<(?:[\\w.-]+:)?${localName}(?:\\s[^>]*)?>([^<]*)</(?:[\\w.-]+:)?${localName}>`,
    ),
  );
  return match?.[1] ?? '';
}

function parsePosList(text: string): SkiTrailPoint[] {
  const nums = text
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));
  const points: SkiTrailPoint[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const lat = nums[i];
    const lon = nums[i + 1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    points.push({ lat, lon });
  }
  return points;
}

function downsample(
  points: SkiTrailPoint[],
  nearestIndex: number,
): SkiTrailPoint[] {
  if (points.length <= MAX_LINE_POINTS) return points;
  const chosen = new Set<number>([0, points.length - 1, nearestIndex]);
  const slots = MAX_LINE_POINTS - chosen.size;
  if (slots > 0) {
    const step = (points.length - 1) / (slots + 1);
    for (let i = 1; i <= slots; i++) {
      chosen.add(Math.round(step * i));
    }
  }
  return [...chosen].sort((a, b) => a - b).map((index) => points[index]);
}

function roundPoint(point: SkiTrailPoint): SkiTrailPoint {
  return { lat: round6(point.lat), lon: round6(point.lon) };
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
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

function bboxAround(lat: number, lon: number, radiusM: number) {
  const latDelta = (radiusM / 6_371_000) * (180 / Math.PI);
  const cos = Math.max(Math.abs(Math.cos((lat * Math.PI) / 180)), 0.01);
  const lonDelta = Math.min(latDelta / cos, 180);
  return {
    minLat: clamp(lat - latDelta, -90, 90),
    maxLat: clamp(lat + latDelta, -90, 90),
    minLon: clamp(lon - lonDelta, -180, 180),
    maxLon: clamp(lon + lonDelta, -180, 180),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a)));
}
