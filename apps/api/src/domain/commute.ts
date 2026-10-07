/**
 * Commute schedule templates and combined preparation.
 *
 * Saved times are Europe/Oslo clock templates, not forecasts.
 * Each leg's clothing still comes from that leg's own engine result.
 */

import type { KitItem } from '../recommend/motorcycle';
import type { RouteWeatherSummary } from '../recommend/weather.types';

export const OSLO_TIME_ZONE = 'Europe/Oslo';

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Pack-rain thresholds already used by the motorcycle engine. */
const RAIN_MM = 0.2;
const RAIN_PROB = 35;
/** Coldest-sample gap that is large enough to mention. Not an average. */
const COLD_RETURN_GAP_C = 6;

export type OsloInstant =
  | { ok: true; instant: Date; ambiguous: boolean }
  | { ok: false; reason: 'invalid' | 'gap' };

export function parseClock(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return CLOCK.test(trimmed) ? trimmed : null;
}

export function isCivilDate(value: string): boolean {
  const match = CIVIL_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function addCivilDays(ymd: string, days: number): string | null {
  if (!isCivilDate(ymd) || !Number.isInteger(days)) return null;
  const match = CIVIL_DATE.exec(ymd);
  if (!match) return null;
  const utc = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]) + days,
    ),
  );
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type OsloParts = {
  civilDate: string;
  time: string;
};

export function osloParts(instant: Date): OsloParts | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: OSLO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = read('year');
  const month = read('month');
  const day = read('day');
  let hour = read('hour');
  const minute = read('minute');
  if (!year || !month || !day || hour == null || minute == null) return null;
  if (hour === '24') hour = '00';
  return {
    civilDate: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function offsetMinutes(instant: Date): number | null {
  const parts = osloParts(instant);
  if (!parts) return null;
  const [year, month, day] = parts.civilDate.split('-').map(Number);
  const [hour, minute] = parts.time.split(':').map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  return (asUtc - instant.getTime()) / 60000;
}

function clockMatches(instant: Date, civilDate: string, time: string): boolean {
  const parts = osloParts(instant);
  return parts?.civilDate === civilDate && parts.time === time;
}

/**
 * Convert a Europe/Oslo civil date and HH:mm to an instant.
 * A spring-forward gap is rejected. An autumn overlap uses the earlier instant.
 */
export function osloInstant(civilDate: string, time: string): OsloInstant {
  if (!isCivilDate(civilDate) || !parseClock(time)) {
    return { ok: false, reason: 'invalid' };
  }
  const [year, month, day] = civilDate.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let pass = 0; pass < 3; pass += 1) {
    const offset = offsetMinutes(new Date(utc));
    if (offset == null) return { ok: false, reason: 'invalid' };
    const next = Date.UTC(year, month - 1, day, hour, minute) - offset * 60000;
    if (next === utc) break;
    utc = next;
  }
  const chosen = new Date(utc);
  if (!clockMatches(chosen, civilDate, time)) {
    return { ok: false, reason: 'gap' };
  }
  const neighbors = [-60, 0, 60]
    .map((minutes) => new Date(chosen.getTime() + minutes * 60000))
    .filter((instant) => clockMatches(instant, civilDate, time))
    .sort((a, b) => a.getTime() - b.getTime());
  const instant = neighbors[0] ?? chosen;
  return {
    ok: true,
    instant,
    ambiguous: neighbors.length > 1,
  };
}

export type CommuteClockInput = {
  date: string;
  outboundTime: string;
  returnTime: string;
  returnNextDay?: boolean;
};

export type ResolvedCommuteClocks =
  | {
      ok: true;
      outbound: Date;
      returnAt: Date;
      outboundAmbiguous: boolean;
      returnAmbiguous: boolean;
      returnDate: string;
    }
  | { ok: false; reason: 'invalid' | 'gap'; field: 'date' | 'outbound' | 'return' };

export function resolveCommuteClocks(
  input: CommuteClockInput,
): ResolvedCommuteClocks {
  if (!isCivilDate(input.date)) {
    return { ok: false, reason: 'invalid', field: 'date' };
  }
  const outbound = osloInstant(input.date, input.outboundTime);
  if (!outbound.ok) {
    return { ok: false, reason: outbound.reason, field: 'outbound' };
  }
  const returnDate = input.returnNextDay
    ? addCivilDays(input.date, 1)
    : input.date;
  if (!returnDate) return { ok: false, reason: 'invalid', field: 'return' };
  const returnAt = osloInstant(returnDate, input.returnTime);
  if (!returnAt.ok) {
    return { ok: false, reason: returnAt.reason, field: 'return' };
  }
  return {
    ok: true,
    outbound: outbound.instant,
    returnAt: returnAt.instant,
    outboundAmbiguous: outbound.ambiguous,
    returnAmbiguous: returnAt.ambiguous,
    returnDate,
  };
}

export function reverseWaypoints<T extends { waypointType?: string | null }>(
  waypoints: T[],
): T[] {
  const reversed = [...waypoints].reverse();
  return reversed.map((waypoint, index) => {
    let waypointType = waypoint.waypointType;
    if (waypointType === 'start' || waypointType === 'end') {
      waypointType = index === 0 ? 'start' : 'end';
    }
    return { ...waypoint, waypointType };
  });
}

function itemKey(item: KitItem): string {
  if (item.garmentId) return `garment:${item.garmentId}`;
  return `generic:${item.slot}:${item.genericLabel ?? item.slot}`;
}

function configKey(item: KitItem): string {
  return [...item.configuration.map((entry) => entry.code)].sort().join('|');
}

/**
 * Wear the outbound kit. Pack gear the return needs that is not already worn.
 * A different liner or vent setup for the same garment is an adjustment,
 * not a second copy of that garment.
 */
export function composeCommutePreparation(
  outbound: { wear: KitItem[]; pack: KitItem[] },
  returnLeg: { wear: KitItem[]; pack: KitItem[] } | null,
): { wear: KitItem[]; pack: KitItem[]; returnAdjustments: KitItem[] } {
  const wear = outbound.wear.map((item) => ({ ...item, mode: 'wear' as const }));
  const worn = new Map(wear.map((item) => [itemKey(item), item]));
  const pack: KitItem[] = [];
  const returnAdjustments: KitItem[] = [];
  const packed = new Set<string>();
  const adjusted = new Set<string>();

  const push = (item: KitItem) => {
    const key = itemKey(item);
    const alreadyWorn = worn.get(key);
    if (alreadyWorn) {
      if (configKey(alreadyWorn) === configKey(item)) return;
      if (adjusted.has(key)) return;
      adjusted.add(key);
      returnAdjustments.push({ ...item, mode: 'pack' });
      return;
    }
    if (packed.has(key)) return;
    packed.add(key);
    pack.push({ ...item, mode: 'pack' });
  };

  for (const item of outbound.pack) push(item);
  if (returnLeg) {
    for (const item of returnLeg.wear) push(item);
    for (const item of returnLeg.pack) push(item);
  }
  return { wear, pack, returnAdjustments };
}

export type CommuteDifferenceCode =
  | 'DRY_MORNING_RAIN_RETURN'
  | 'WARM_OUTBOUND_COLD_RETURN';

function reportsRain(weather: RouteWeatherSummary): boolean {
  return weather.maxPrecipMm >= RAIN_MM || weather.maxRainProbPct >= RAIN_PROB;
}

/**
 * Mention a contrast only when both forecasts actually support it.
 * Temperatures are not averaged, and a missing return adds no weather claim.
 */
export function commuteDifferenceCodes(
  outbound: RouteWeatherSummary | null,
  returnWeather: RouteWeatherSummary | null,
): CommuteDifferenceCode[] {
  if (!outbound || !returnWeather) return [];
  const codes: CommuteDifferenceCode[] = [];
  if (!reportsRain(outbound) && reportsRain(returnWeather)) {
    codes.push('DRY_MORNING_RAIN_RETURN');
  }
  if (returnWeather.minTempC <= outbound.minTempC - COLD_RETURN_GAP_C) {
    codes.push('WARM_OUTBOUND_COLD_RETURN');
  }
  return codes;
}
