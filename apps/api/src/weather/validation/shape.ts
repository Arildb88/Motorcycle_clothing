import {
  VALIDATION_LIMITS,
  type FrozenCase,
  type InversionPeer,
  type LeadBucket,
} from './types';

const OSLO_TIME_ZONE = 'Europe/Oslo';

/** Truncate toward zero to 4 decimal degrees. Float noise past the 8th decimal is not kept. */
export function truncateCoord4(value: number, maxAbs: number): number | null {
  if (!Number.isFinite(value) || Math.abs(value) > maxAbs) return null;
  const sign = value < 0 ? -1 : 1;
  const [whole, fraction = ''] = Math.abs(value).toFixed(8).split('.');
  const sliced = fraction.slice(0, 4).padEnd(4, '0');
  const truncated = Number(`${whole}.${sliced}`);
  return Number.isFinite(truncated) ? sign * truncated : null;
}

export function truncateLat(value: number): number | null {
  return truncateCoord4(value, 90);
}

export function truncateLon(value: number): number | null {
  return truncateCoord4(value, 180);
}

export function roundElevationM(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

export function parseInstant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function sameInstant(left: string, right: string): boolean {
  const a = parseInstant(left);
  const b = parseInstant(right);
  return a != null && a === b;
}

type OsloClock = {
  civilDate: string;
  minutes: number;
};

export function osloClock(iso: string): OsloClock | null {
  const instant = parseInstant(iso);
  if (instant == null) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: OSLO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = read('year');
  const month = read('month');
  const day = read('day');
  const hour = read('hour');
  const minute = read('minute');
  if (!year || !month || !day || hour == null || minute == null) return null;
  return {
    civilDate: `${year}-${month}-${day}`,
    minutes: Number(hour) * 60 + Number(minute),
  };
}

function previousCivilDate(ymd: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * Inclusive bounds from §11.2. A row that misses its declared bucket is dropped,
 * not moved into another bucket.
 */
export function leadMatchesBucket(
  bucket: LeadBucket,
  validTimeUtc: string,
  fetchedAt: string,
): boolean {
  const valid = parseInstant(validTimeUtc);
  const fetched = parseInstant(fetchedAt);
  if (valid == null || fetched == null) return false;
  const leadMs = valid - fetched;
  if (bucket === 'h1') {
    return (
      leadMs >= VALIDATION_LIMITS.leadH1MinMs &&
      leadMs <= VALIDATION_LIMITS.leadH1MaxMs
    );
  }
  if (bucket === 'h6') {
    return (
      leadMs >= VALIDATION_LIMITS.leadH6MinMs &&
      leadMs <= VALIDATION_LIMITS.leadH6MaxMs
    );
  }
  const validClock = osloClock(validTimeUtc);
  const fetchedClock = osloClock(fetchedAt);
  if (!validClock || !fetchedClock) return false;
  const previous = previousCivilDate(validClock.civilDate);
  return (
    validClock.minutes >= VALIDATION_LIMITS.nextMorningValidStartMin &&
    validClock.minutes <= VALIDATION_LIMITS.nextMorningValidEndMin &&
    fetchedClock.minutes >= VALIDATION_LIMITS.nextMorningFetchStartMin &&
    fetchedClock.minutes <= VALIDATION_LIMITS.nextMorningFetchEndMin &&
    fetchedClock.civilDate === previous
  );
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type ShapedCase = {
  caseId: string;
  lat: number;
  lon: number;
  elevationM: number;
  validTimeUtc: string;
  leadBucket: LeadBucket;
  stratum: FrozenCase['stratum'];
  site: FrozenCase['site'];
  stationAirTempC: number | null;
  inversionPeer: InversionPeer | null;
};

export function shapeCase(
  raw: FrozenCase,
): { ok: true; shaped: ShapedCase } | { ok: false; reason: string } {
  if (!raw.caseId || !raw.caseId.trim()) {
    return { ok: false, reason: 'invalid_case' };
  }
  const lat = truncateLat(raw.lat);
  const lon = truncateLon(raw.lon);
  const elevationM = roundElevationM(raw.elevationM);
  if (lat == null || lon == null || elevationM == null) {
    return { ok: false, reason: 'invalid_case' };
  }
  if (parseInstant(raw.validTimeUtc) == null) {
    return { ok: false, reason: 'invalid_case' };
  }
  if (
    raw.leadBucket !== 'h1' &&
    raw.leadBucket !== 'h6' &&
    raw.leadBucket !== 'next_morning'
  ) {
    return { ok: false, reason: 'invalid_case' };
  }
  if (
    raw.stratum !== 'coast' &&
    raw.stratum !== 'inland_valley' &&
    raw.stratum !== 'inversion' &&
    raw.stratum !== 'high_site' &&
    raw.stratum !== 'route'
  ) {
    return { ok: false, reason: 'invalid_case' };
  }
  if (raw.site !== 'station' && raw.site !== 'route' && raw.site !== 'resort') {
    return { ok: false, reason: 'invalid_case' };
  }
  const shaped: ShapedCase = {
    caseId: raw.caseId,
    lat,
    lon,
    elevationM,
    validTimeUtc: raw.validTimeUtc,
    leadBucket: raw.leadBucket,
    stratum: raw.stratum,
    site: raw.site,
    stationAirTempC:
      raw.stationAirTempC != null && Number.isFinite(raw.stationAirTempC)
        ? raw.stationAirTempC
        : null,
    inversionPeer: raw.inversionPeer ?? null,
  };
  if (
    shaped.stratum === 'high_site' &&
    shaped.elevationM < VALIDATION_LIMITS.highSiteMinElevationM
  ) {
    return { ok: false, reason: 'stratum_unmet' };
  }
  if (shaped.stratum === 'inversion' && !inversionCriteriaMet(shaped)) {
    return { ok: false, reason: 'stratum_unmet' };
  }
  return { ok: true, shaped };
}

export function inversionCriteriaMet(shaped: ShapedCase): boolean {
  const peer = shaped.inversionPeer;
  if (!peer || shaped.stationAirTempC == null) return false;
  if (!Number.isFinite(peer.airTempC)) return false;
  if (!sameInstant(peer.validTimeUtc, shaped.validTimeUtc)) return false;
  const peerLat = truncateLat(peer.lat);
  const peerLon = truncateLon(peer.lon);
  const peerElevation = roundElevationM(peer.elevationM);
  if (peerLat == null || peerLon == null || peerElevation == null) return false;
  if (
    Math.abs(shaped.elevationM - peerElevation) <
    VALIDATION_LIMITS.inversionMinElevationDiffM
  ) {
    return false;
  }
  const lowerIsCase = shaped.elevationM < peerElevation;
  const lowerTemp = lowerIsCase ? shaped.stationAirTempC : peer.airTempC;
  const upperTemp = lowerIsCase ? peer.airTempC : shaped.stationAirTempC;
  if (lowerTemp > upperTemp - VALIDATION_LIMITS.inversionMinColderC)
    return false;
  const distance = haversineMetres(shaped.lat, shaped.lon, peerLat, peerLon);
  return distance <= VALIDATION_LIMITS.inversionMaxSeparationM;
}
