import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import {
  LegForecast,
  maxFiniteWeatherNumber,
  RouteWeatherSummary,
  WeatherPoint,
} from '../recommend/weather.types';
import {
  comparisonRowFromSamples,
  type DepartureComparisonRow,
  type DepartureSampleConditions,
} from './departure-compare';
import { matchMetTimeseries } from './met-timeseries';
import {
  metLocationForecastUrl,
  weatherCacheKey,
  weatherSeriesCacheKey,
} from './met-request';
import type { WeatherFailureReason } from '../recommend/weather.types';

export const MET_FAILURE_LOGS = {
  series: 'MET forecast series unavailable',
  noTemperature: 'MET forecast missing required measurement',
  fetch: 'MET forecast request failed',
  timeout: 'MET forecast request timed out',
  outOfRange: 'MET forecast time out of range',
  configuration: 'Weather provider configuration rejected',
} as const;

/** Runtime provider. Unset means MET. `mock` and any other name are rejected. */
export function resolveRuntimeWeatherProvider(raw: string | null | undefined):
  | { ok: true }
  | { ok: false; message: string } {
  const provider = (raw ?? '').trim().toLowerCase();
  if (provider === '' || provider === 'met') return { ok: true };
  if (provider === 'mock') {
    return {
      ok: false,
      message:
        'WEATHER_PROVIDER=mock is not a runtime weather provider. Set WEATHER_PROVIDER=met in the local environment and set MET_USER_AGENT to an app name plus a contact address. The example.com value in .env.example is a placeholder. Do not commit secrets. Restart the API after changing .env.',
    };
  }
  return {
    ok: false,
    message: `WEATHER_PROVIDER=${provider} is not supported. Set WEATHER_PROVIDER=met and MET_USER_AGENT to an app name plus a contact address.`,
  };
}

/** MET requires an identifying contact. Placeholders are not that contact. */
export function resolveMetUserAgent(raw: string | null | undefined): string | null {
  const ua = (raw ?? '').trim();
  if (!ua) return null;
  if (/example\.(com|org|net)/i.test(ua)) return null;
  if (/\((dev|staging|test|smoke)\)/i.test(ua)) return null;
  const hasContact =
    ua.includes('@') || ua.includes('http://') || ua.includes('https://');
  return hasContact ? ua : null;
}

export function weatherConfigurationMessage(rawProvider: string | null | undefined, rawAgent: string | null | undefined): string | null {
  const provider = resolveRuntimeWeatherProvider(rawProvider);
  if (!provider.ok) return provider.message;
  if (!resolveMetUserAgent(rawAgent)) {
    return 'MET_USER_AGENT must identify this app and include a contact address or contact URL before MET is called. Set it in the local environment. Do not commit secrets. Restart the API after changing .env.';
  }
  return null;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async forRoutePoints(
    points: Array<{ lat: number; lon: number }>,
  ): Promise<RouteWeatherSummary> {
    if (points.length === 0) return blockedWeather('unavailable', 'missing');
    return this.forRouteSamples(this.samplePoints(points));
  }

  /**
   * Fetch one forecast per already-chosen sample. Does not collapse the set.
   * When `at` is set, MET uses the timeseries entry nearest that ETA.
   */
  async forRouteSamples(
    samples: Array<{
      lat: number;
      lon: number;
      at?: Date;
      altitudeM?: number | null;
    }>,
  ): Promise<RouteWeatherSummary> {
    const gate = this.runtimeGate();
    if (!gate.ok) return blockedWeather('unavailable', 'configuration');
    if (samples.length === 0) return blockedWeather('unavailable', 'missing');

    const loaded = await Promise.all(
      samples.map((sample) =>
        this.pointWeather(
          sample.lat,
          sample.lon,
          gate.userAgent,
          sample.at,
          sample.altitudeM,
        ),
      ),
    );
    const failures = loaded.filter(
      (item): item is PointFailure => item.ok === false,
    );
    if (failures.length > 0) {
      return blockedWeather(
        failures.length === loaded.length ? 'unavailable' : 'partial',
        dominantReason(failures.map((item) => item.reason)),
      );
    }
    const points = loaded.map((item, index) => {
      const point = (item as PointSuccess).point;
      const at = samples[index].at;
      return at && !Number.isNaN(at.getTime())
        ? { ...point, forecastAt: at.toISOString() }
        : point;
    });
    return this.summarize(points);
  }

  /**
   * Forecast for one commute leg.
   * MET times outside the published series stay unavailable.
   * This does not borrow another leg's samples.
   */
  async forecastLeg(
    samples: Array<{
      lat: number;
      lon: number;
      at?: Date;
      altitudeM?: number | null;
    }>,
  ): Promise<LegForecast> {
    const weather = await this.forRouteSamples(samples);
    if (weather.status !== 'available' || weather.source !== 'met') {
      return { available: false, reason: weather.reason ?? 'missing' };
    }
    return { available: true, weather };
  }

  /**
   * Conditions for several departures that share the same route samples.
   * One locationforecast request covers every departure at that place.
   * The existing per-hour point cache is filled for samples that are in range
   * so the recommendation for the chosen departure does not fetch them again.
   * Out-of-range times stay unavailable. They are not replaced with mock weather.
   */
  async compareSampleGroups(
    groups: Array<
      Array<{
        lat: number;
        lon: number;
        at?: Date;
        altitudeM?: number | null;
      }>
    >,
  ): Promise<DepartureComparisonRow[]> {
    const gate = this.runtimeGate();
    if (!gate.ok) {
      return groups.map((group) =>
        comparisonRowFromSamples(
          group.map((sample) => ({
            requestedAt: sample.at?.toISOString() ?? '',
            available: false,
            reason: 'configuration' as const,
          })),
          false,
        ),
      );
    }
    const seriesByPlace = new Map<string, Promise<SeriesLoad>>();

    const rows: DepartureSampleConditions[][] = [];
    for (const group of groups) {
      const samples: DepartureSampleConditions[] = [];
      for (const sample of group) {
        const requestedAt = sample.at?.toISOString() ?? '';
        if (!sample.at || Number.isNaN(sample.at.getTime())) {
          samples.push({
            requestedAt,
            available: false,
            reason: 'missing',
          });
          continue;
        }

        const series = await this.metSeriesFor(
          sample.lat,
          sample.lon,
          sample.altitudeM,
          gate.userAgent,
          seriesByPlace,
        );
        if (!series.ok) {
          samples.push({
            requestedAt,
            available: false,
            reason: series.reason,
          });
          continue;
        }
        const match = matchMetTimeseries(
          series.series.map((entry) => entry.time),
          sample.at,
        );
        const point =
          match == null
            ? null
            : metPointFromEntry(series.series[match.index], sample.lat, sample.lon);
        if (!match || !match.inRange || !point) {
          samples.push({
            requestedAt,
            available: false,
            reason:
              match && !match.inRange
                ? 'out_of_range'
                : point
                  ? 'missing'
                  : 'missing_fields',
          });
          continue;
        }
        const stored = withGroundElevation(point, sample.altitudeM);
        await this.storePoint(
          weatherCacheKey({
            provider: 'met',
            lat: sample.lat,
            lon: sample.lon,
            at: sample.at,
            altitudeM: sample.altitudeM,
          }),
          stored,
        );
        samples.push(sampleConditions(requestedAt, match.matchedAt, stored));
      }
      rows.push(samples);
    }

    return rows.map((samples) => comparisonRowFromSamples(samples, true));
  }

  private runtimeGate():
    | { ok: true; userAgent: string }
    | { ok: false } {
    const message = weatherConfigurationMessage(
      this.config.get<string>('WEATHER_PROVIDER'),
      this.config.get<string>('MET_USER_AGENT'),
    );
    if (message) {
      this.logger.warn(MET_FAILURE_LOGS.configuration);
      return { ok: false };
    }
    return {
      ok: true,
      userAgent: resolveMetUserAgent(this.config.get<string>('MET_USER_AGENT'))!,
    };
  }

  private summarize(weatherPoints: WeatherPoint[]): RouteWeatherSummary {
    const temps = weatherPoints.map((p) => p.airTempC);
    const rains = weatherPoints.map((p) => p.precipitationProbPct);
    const precips = weatherPoints.map((p) => p.precipitationMm);
    const winds = weatherPoints.map((p) => p.windSpeedMs);
    const validAt = weatherPoints
      .map((point) => point.forecastValidAt)
      .filter((time): time is string => typeof time === 'string')
      .sort();

    return {
      provider: 'met',
      status: 'available',
      source: 'met',
      forecastValidAt: validAt[0],
      sampledAt: new Date().toISOString(),
      points: weatherPoints,
      minTempC: Math.min(...temps),
      maxTempC: Math.max(...temps),
      maxRainProbPct: maxFiniteWeatherNumber(rains),
      maxPrecipMm: Math.max(...precips),
      maxWindMs: Math.max(...winds),
    };
  }

  private samplePoints(
    points: Array<{ lat: number; lon: number }>,
  ): Array<{ lat: number; lon: number }> {
    if (points.length <= 3) return points;
    const mid = points[Math.floor(points.length / 2)];
    return [points[0], mid, points[points.length - 1]];
  }

  private async pointWeather(
    lat: number,
    lon: number,
    userAgent: string,
    at?: Date,
    altitudeM?: number | null,
  ): Promise<PointSuccess | PointFailure> {
    const key = weatherCacheKey({
      provider: 'met',
      lat,
      lon,
      at,
      altitudeM,
    });
    const cached = await this.readCachedPoint(key);
    if (cached) {
      return {
        ok: true,
        point: withGroundElevation({ ...cached, lat, lon }, altitudeM),
      };
    }

    const loaded = await this.loadMetSeries(
      lat,
      lon,
      altitudeM,
      weatherSeriesCacheKey({
        provider: 'met',
        lat,
        lon,
        altitudeM,
      }),
      userAgent,
    );
    if (!loaded.ok) return loaded;

    let entry: MetSeriesEntry | undefined;
    let validAt: string | undefined;
    if (at && !Number.isNaN(at.getTime())) {
      const match = matchMetTimeseries(
        loaded.series.map((item) => item.time),
        at,
      );
      if (!match) return { ok: false, reason: 'missing' };
      if (!match.inRange) {
        this.logger.warn(MET_FAILURE_LOGS.outOfRange);
        return { ok: false, reason: 'out_of_range' };
      }
      entry = loaded.series[match.index];
      validAt = match.matchedAt;
    } else {
      entry = loaded.series[0];
      const parsed = Date.parse(entry?.time ?? '');
      if (!Number.isFinite(parsed)) return { ok: false, reason: 'empty' };
      validAt = new Date(parsed).toISOString();
    }

    const point = metPointFromEntry(entry, lat, lon);
    if (!point) {
      this.logger.warn(MET_FAILURE_LOGS.noTemperature);
      return { ok: false, reason: 'missing_fields' };
    }
    const stored = withGroundElevation(
      { ...point, forecastValidAt: validAt },
      altitudeM,
    );
    await this.storePoint(key, stored);
    return { ok: true, point: stored };
  }

  private async readCachedPoint(key: string): Promise<WeatherPoint | null> {
    const cached = await this.prisma.weatherCache.findUnique({
      where: { cacheKey: key },
    });
    if (!cached || cached.validUntil <= new Date()) return null;
    try {
      const stored = JSON.parse(cached.payloadJson) as WeatherPoint;
      if (!usableCachedPoint(stored)) return null;
      return stored;
    } catch {
      return null;
    }
  }

  private async storePoint(key: string, point: WeatherPoint): Promise<void> {
    await this.storeJson(key, persistedWeatherPoint(point));
  }

  private async storeJson(key: string, payload: unknown): Promise<void> {
    const validUntil = new Date(Date.now() + 15 * 60 * 1000);
    const payloadJson = JSON.stringify(payload);
    await this.prisma.weatherCache.deleteMany({
      where: { validUntil: { lt: new Date() } },
    });
    await this.prisma.weatherCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        payloadJson,
        validUntil,
      },
      update: {
        payloadJson,
        validUntil,
      },
    });
  }

  /**
   * Locationforecast for one place, reused across departure hours.
   * A failed or empty payload is not cached, so the next request can retry.
   */
  private metSeriesFor(
    lat: number,
    lon: number,
    altitudeM: number | null | undefined,
    userAgent: string,
    memo: Map<string, Promise<SeriesLoad>>,
  ): Promise<SeriesLoad> {
    const key = weatherSeriesCacheKey({
      provider: 'met',
      lat,
      lon,
      altitudeM,
    });
    const pending = memo.get(key);
    if (pending) return pending;
    const loading = this.loadMetSeries(lat, lon, altitudeM, key, userAgent);
    memo.set(key, loading);
    return loading;
  }

  private async loadMetSeries(
    lat: number,
    lon: number,
    altitudeM: number | null | undefined,
    key: string,
    userAgent: string,
  ): Promise<SeriesLoad> {
    const cached = await this.prisma.weatherCache.findUnique({
      where: { cacheKey: key },
    });
    if (cached && cached.validUntil > new Date()) {
      const parsed = parseMetSeries(cached.payloadJson);
      if (parsed) return { ok: true, series: parsed };
    }

    try {
      const url = metLocationForecastUrl(lat, lon, altitudeM);
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        timeout: 8000,
      });
      const timeseries = data?.properties?.timeseries;
      if (!Array.isArray(timeseries) || timeseries.length === 0) {
        this.logger.warn(MET_FAILURE_LOGS.series);
        return { ok: false, reason: 'empty' };
      }
      const minimized = minimizeMetSeries(timeseries);
      if (minimized.length === 0) {
        this.logger.warn(MET_FAILURE_LOGS.series);
        return { ok: false, reason: 'empty' };
      }
      await this.storeJson(key, minimized);
      return { ok: true, series: minimized };
    } catch (err) {
      const reason = axiosFailureReason(err);
      this.logger.warn(
        reason === 'timeout' ? MET_FAILURE_LOGS.timeout : MET_FAILURE_LOGS.fetch,
      );
      return { ok: false, reason };
    }
  }
}

/** Cache identity is 0.001°. Do not persist a finer coordinate in the shared row. */
export function persistedWeatherPoint(point: WeatherPoint): WeatherPoint {
  return {
    ...point,
    lat: Number(point.lat.toFixed(3)),
    lon: Number(point.lon.toFixed(3)),
  };
}

/**
 * Keep the MET fields the clothing forecast reads.
 * Humidity, pressure, cloud, and wind direction are not used and are not stored.
 */
export function minimizeMetSeries(raw: unknown): MetSeriesEntry[] {
  if (!Array.isArray(raw)) return [];
  const minimized: MetSeriesEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as {
      time?: unknown;
      data?: {
        instant?: { details?: Record<string, unknown> };
        next_1_hours?: MetSlot & { details?: Record<string, unknown> };
        next_6_hours?: MetSlot & { details?: Record<string, unknown> };
      };
    };
    const instant = row.data?.instant?.details;
    minimized.push({
      time: typeof row.time === 'string' ? row.time : undefined,
      data: {
        instant: {
          details: {
            air_temperature: numberOrUndefined(instant?.air_temperature),
            wind_speed: numberOrUndefined(instant?.wind_speed),
          },
        },
        next_1_hours: minimizedSlot(row.data?.next_1_hours),
        next_6_hours: minimizedSlot(row.data?.next_6_hours),
      },
    });
  }
  return minimized;
}

function minimizedSlot(
  source: (MetSlot & { details?: Record<string, unknown> }) | undefined,
): MetSlot | undefined {
  if (!source) return undefined;
  const symbol = source.summary?.symbol_code;
  return {
    details: {
      probability_of_precipitation: numberOrUndefined(
        source.details?.probability_of_precipitation,
      ),
      precipitation_amount: numberOrUndefined(
        source.details?.precipitation_amount,
      ),
    },
    summary: typeof symbol === 'string' ? { symbol_code: symbol } : undefined,
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function withGroundElevation(
  point: WeatherPoint,
  altitudeM?: number | null,
): WeatherPoint {
  if (altitudeM == null || !Number.isFinite(altitudeM)) return point;
  return { ...point, groundElevationM: Math.round(altitudeM) };
}

type MetSlot = {
  details?: {
    probability_of_precipitation?: number;
    precipitation_amount?: number;
  };
  summary?: { symbol_code?: string };
};

type MetSeriesEntry = {
  time?: string;
  data?: {
    instant?: { details?: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: MetSlot;
    next_6_hours?: MetSlot;
  };
};

function parseMetSeries(payloadJson: string): MetSeriesEntry[] | null {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as MetSeriesEntry[];
  } catch {
    return null;
  }
}

function metPointFromEntry(
  entry: MetSeriesEntry | undefined,
  lat: number,
  lon: number,
): WeatherPoint | null {
  const instant = entry?.data?.instant?.details;
  const next = entry?.data?.next_1_hours ?? entry?.data?.next_6_hours;
  const airTempC = finiteNumber(instant?.air_temperature);
  const windSpeedMs = finiteNumber(instant?.wind_speed);
  const precipitationProbPct = finiteNumber(
    next?.details?.probability_of_precipitation,
  );
  const precipitationMm = finiteNumber(next?.details?.precipitation_amount);
  const parsed = Date.parse(entry?.time ?? '');
  if (
    airTempC == null ||
    windSpeedMs == null ||
    precipitationMm == null ||
    !Number.isFinite(parsed)
  ) {
    return null;
  }
  return {
    lat,
    lon,
    airTempC,
    precipitationProbPct,
    precipitationMm,
    windSpeedMs,
    symbol: next?.summary?.symbol_code,
    source: 'met',
    forecastValidAt: new Date(parsed).toISOString(),
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function usableCachedPoint(point: WeatherPoint): boolean {
  return (
    point.source === 'met' &&
    typeof point.forecastValidAt === 'string' &&
    point.forecastValidAt.length > 0 &&
    finiteNumber(point.airTempC) != null &&
    finiteNumber(point.windSpeedMs) != null &&
    (point.precipitationProbPct == null ||
      finiteNumber(point.precipitationProbPct) != null) &&
    finiteNumber(point.precipitationMm) != null
  );
}

type PointSuccess = { ok: true; point: WeatherPoint };
type PointFailure = { ok: false; reason: WeatherFailureReason };
type SeriesLoad =
  | { ok: true; series: MetSeriesEntry[] }
  | { ok: false; reason: WeatherFailureReason };

function blockedWeather(
  status: 'partial' | 'unavailable',
  reason: WeatherFailureReason,
): RouteWeatherSummary {
  return {
    provider: 'met',
    status,
    reason,
    sampledAt: new Date().toISOString(),
    points: [],
    minTempC: Number.NaN,
    maxTempC: Number.NaN,
    maxRainProbPct: Number.NaN,
    maxPrecipMm: Number.NaN,
    maxWindMs: Number.NaN,
  };
}

function dominantReason(reasons: WeatherFailureReason[]): WeatherFailureReason {
  const order: WeatherFailureReason[] = [
    'configuration',
    'timeout',
    'empty',
    'missing_fields',
    'out_of_range',
    'provider',
    'missing',
  ];
  for (const reason of order) {
    if (reasons.includes(reason)) return reason;
  }
  return 'provider';
}

function axiosFailureReason(err: unknown): 'timeout' | 'provider' {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return 'timeout';
  return 'provider';
}

function sampleConditions(
  requestedAt: string,
  forecastAt: string,
  point: WeatherPoint,
): DepartureSampleConditions {
  return {
    requestedAt,
    available: true,
    forecastAt,
    airTempC: point.airTempC,
    precipitationProbPct: point.precipitationProbPct,
    precipitationMm: point.precipitationMm,
    windSpeedMs: point.windSpeedMs,
  };
}
