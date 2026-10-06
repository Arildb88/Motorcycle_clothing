import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RouteWeatherSummary, WeatherPoint } from '../recommend/weather.types';
import {
  comparisonRowFromSamples,
  type DepartureComparisonRow,
  type DepartureSampleConditions,
} from './departure-compare';
import { matchMetTimeseries, selectMetTimeseriesIndex } from './met-timeseries';
import {
  metLocationForecastUrl,
  weatherCacheKey,
  weatherSeriesCacheKey,
} from './met-request';

export const MET_FAILURE_LOGS = {
  series: 'MET fetch failed; comparison has no series',
  noTemperature: 'MET fetch returned no temperature; using mock',
  fetch: 'MET fetch failed; using mock',
} as const;

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
    const provider = this.config.get('WEATHER_PROVIDER', 'mock');
    const samples =
      points.length > 0 ? points : [{ lat: 59.9139, lon: 10.7522 }];

    // Always include start, mid (if multiple), end
    const sampled = this.samplePoints(samples);

    // Samples are independent cache/provider lookups. Running them serially made
    // route-weather latency the sum of every sample latency (up to three here).
    // Promise.all preserves sample order while allowing the existing provider and
    // cache abstractions to do the independent work concurrently.
    const weatherPoints = await Promise.all(
      sampled.map((p) => this.pointWeather(p.lat, p.lon, provider)),
    );

    return this.summarize(provider, weatherPoints);
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
    const provider = this.config.get('WEATHER_PROVIDER', 'mock');
    const usable =
      samples.length > 0 ? samples : [{ lat: 59.9139, lon: 10.7522 }];

    // Route samples have no ordering dependency. Start their cache/provider
    // lookups together; Promise.all keeps the returned points in route order.
    const weatherPoints = await Promise.all(
      usable.map(async (sample) => {
        const point = await this.pointWeather(
          sample.lat,
          sample.lon,
          provider,
          sample.at,
          sample.altitudeM,
        );
        return sample.at
          ? { ...point, forecastAt: sample.at.toISOString() }
          : point;
      }),
    );

    return this.summarize(provider, weatherPoints);
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
    const provider = this.config.get('WEATHER_PROVIDER', 'mock');
    const variesByTime = provider === 'met';
    const seriesByPlace = new Map<string, Promise<MetSeriesEntry[] | null>>();
    const mockByPlace = new Map<string, WeatherPoint>();

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

        if (!variesByTime) {
          const place = weatherSeriesCacheKey({
            provider,
            lat: sample.lat,
            lon: sample.lon,
            altitudeM: sample.altitudeM,
          });
          let point = mockByPlace.get(place);
          if (!point) {
            point = withGroundElevation(
              this.mockWeather(sample.lat, sample.lon),
              sample.altitudeM,
            );
            mockByPlace.set(place, point);
          }
          await this.storePoint(
            weatherCacheKey({
              provider,
              lat: sample.lat,
              lon: sample.lon,
              at: sample.at,
              altitudeM: sample.altitudeM,
            }),
            point,
          );
          samples.push(
            sampleConditions(requestedAt, sample.at.toISOString(), point),
          );
          continue;
        }

        const series = await this.metSeriesFor(
          sample.lat,
          sample.lon,
          sample.altitudeM,
          seriesByPlace,
        );
        if (!series) {
          samples.push({
            requestedAt,
            available: false,
            reason: 'missing',
          });
          continue;
        }
        const match = matchMetTimeseries(
          series.map((entry) => entry.time),
          sample.at,
        );
        const point =
          match == null
            ? null
            : metPointFromEntry(series[match.index], sample.lat, sample.lon);
        if (!match || !match.inRange || !point) {
          samples.push({
            requestedAt,
            available: false,
            reason: match && !match.inRange ? 'out_of_range' : 'missing',
          });
          continue;
        }
        const stored = withGroundElevation(point, sample.altitudeM);
        await this.storePoint(
          weatherCacheKey({
            provider,
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

    return rows.map((samples) =>
      comparisonRowFromSamples(samples, variesByTime),
    );
  }

  private summarize(
    provider: string,
    weatherPoints: WeatherPoint[],
  ): RouteWeatherSummary {
    const temps = weatherPoints.map((p) => p.airTempC);
    const rains = weatherPoints.map((p) => p.precipitationProbPct);
    const precips = weatherPoints.map((p) => p.precipitationMm);
    const winds = weatherPoints.map((p) => p.windSpeedMs);

    return {
      provider,
      sampledAt: new Date().toISOString(),
      points: weatherPoints,
      minTempC: Math.min(...temps),
      maxTempC: Math.max(...temps),
      maxRainProbPct: Math.max(...rains),
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
    provider: string,
    at?: Date,
    altitudeM?: number | null,
  ): Promise<WeatherPoint> {
    const key = weatherCacheKey({ provider, lat, lon, at, altitudeM });
    const cached = await this.prisma.weatherCache.findUnique({
      where: { cacheKey: key },
    });
    if (cached && cached.validUntil > new Date()) {
      const stored = JSON.parse(cached.payloadJson) as WeatherPoint;
      // The shared cache must not hand one rider another rider's sample.
      return { ...stored, lat, lon };
    }

    const fetched =
      provider === 'met'
        ? await this.fetchMet(lat, lon, at, altitudeM)
        : this.mockWeather(lat, lon);
    const point = withGroundElevation(fetched, altitudeM);

    await this.storePoint(key, point);
    return point;
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
    memo: Map<string, Promise<MetSeriesEntry[] | null>>,
  ): Promise<MetSeriesEntry[] | null> {
    const key = weatherSeriesCacheKey({
      provider: 'met',
      lat,
      lon,
      altitudeM,
    });
    const pending = memo.get(key);
    if (pending) return pending;
    const loading = this.loadMetSeries(lat, lon, altitudeM, key);
    memo.set(key, loading);
    return loading;
  }

  private async loadMetSeries(
    lat: number,
    lon: number,
    altitudeM: number | null | undefined,
    key: string,
  ): Promise<MetSeriesEntry[] | null> {
    const cached = await this.prisma.weatherCache.findUnique({
      where: { cacheKey: key },
    });
    if (cached && cached.validUntil > new Date()) {
      const parsed = parseMetSeries(cached.payloadJson);
      if (parsed) return parsed;
    }

    const userAgent = this.config.get(
      'MET_USER_AGENT',
      'MotorcycleClothingApp/0.1 (dev)',
    );
    try {
      const url = metLocationForecastUrl(lat, lon, altitudeM);
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        timeout: 8000,
      });
      const timeseries = data?.properties?.timeseries;
      if (!Array.isArray(timeseries) || timeseries.length === 0) return null;
      const minimized = minimizeMetSeries(timeseries);
      if (minimized.length === 0) return null;
      await this.storeJson(key, minimized);
      return minimized;
    } catch {
      this.logger.warn(MET_FAILURE_LOGS.series);
      return null;
    }
  }

  private mockWeather(lat: number, lon: number): WeatherPoint {
    // Deterministic-ish mock from coordinates + day of year
    const day = new Date().getMonth() * 30 + new Date().getDate();
    const base = 8 + Math.sin((day / 365) * Math.PI * 2) * 10;
    const jitter = ((Math.abs(lat * 1000 + lon * 100) % 7) - 3) * 0.4;
    const airTempC = Number((base + jitter).toFixed(1));
    const precipitationProbPct = Math.abs(Math.floor(lat * 100 + day)) % 70;
    const precipitationMm =
      precipitationProbPct > 50
        ? Number((precipitationProbPct / 80).toFixed(2))
        : 0;
    const windSpeedMs = 2 + (Math.abs(Math.floor(lon * 50 + day)) % 8);

    return {
      lat,
      lon,
      airTempC,
      precipitationProbPct,
      precipitationMm,
      windSpeedMs,
      symbol: precipitationProbPct > 50 ? 'rain' : 'fair',
    };
  }

  private async fetchMet(
    lat: number,
    lon: number,
    at?: Date,
    altitudeM?: number | null,
  ): Promise<WeatherPoint> {
    const userAgent = this.config.get(
      'MET_USER_AGENT',
      'MotorcycleClothingApp/0.1 (dev)',
    );
    try {
      const url = metLocationForecastUrl(lat, lon, altitudeM);
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        timeout: 8000,
      });
      const timeseries = data?.properties?.timeseries ?? [];
      const index = selectMetTimeseriesIndex(
        timeseries.map((entry: { time?: string }) => entry?.time),
        at,
      );
      const series = timeseries[index]?.data;
      const instant = series?.instant?.details;
      // An empty payload is a provider miss. Caching it as 0 °C would dress
      // the rider for a calm freeze that MET did not report.
      if (
        !Array.isArray(timeseries) ||
        timeseries.length === 0 ||
        instant?.air_temperature == null
      ) {
        this.logger.warn(MET_FAILURE_LOGS.noTemperature);
        return this.mockWeather(lat, lon);
      }
      const next1 = series?.next_1_hours ?? series?.next_6_hours ?? {};
      return {
        lat,
        lon,
        airTempC: Number(instant.air_temperature),
        precipitationProbPct: Number(
          next1?.details?.probability_of_precipitation ?? 0,
        ),
        precipitationMm: Number(next1?.details?.precipitation_amount ?? 0),
        windSpeedMs: Number(instant.wind_speed ?? 0),
        symbol: next1?.summary?.symbol_code,
      };
    } catch {
      this.logger.warn(MET_FAILURE_LOGS.fetch);
      return this.mockWeather(lat, lon);
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
  if (instant?.air_temperature == null) return null;
  const next = entry?.data?.next_1_hours ?? entry?.data?.next_6_hours ?? {};
  return {
    lat,
    lon,
    airTempC: Number(instant.air_temperature),
    precipitationProbPct: Number(
      next.details?.probability_of_precipitation ?? 0,
    ),
    precipitationMm: Number(next.details?.precipitation_amount ?? 0),
    windSpeedMs: Number(instant.wind_speed ?? 0),
    symbol: next.summary?.symbol_code,
  };
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
