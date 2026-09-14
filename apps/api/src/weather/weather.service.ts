import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import {
  RouteWeatherSummary,
  WeatherPoint,
} from '../recommend/weather.types';
import type {
  WeatherForecastRequest,
  WeatherObservation,
  WeatherPort,
} from './weather.port';

/**
 * WeatherService implements WeatherPort.
 *
 * forRoutePoints — legacy origin/mid/end sampling (no time axis).
 * forecast — time-aware observations for route weather timelines (bounded).
 *
 * Does not invent wind direction. Does not log precise coordinates.
 */
@Injectable()
export class WeatherService implements WeatherPort {
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
      points.length > 0
        ? points
        : [{ lat: 59.9139, lon: 10.7522 }];

    // Legacy path: start, mid (if multiple), end — no per-sample ETA.
    const sampled = this.samplePoints(samples);

    const weatherPoints: WeatherPoint[] = [];
    for (const p of sampled) {
      weatherPoints.push(await this.pointWeather(p.lat, p.lon, provider));
    }

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

  /**
   * Time-aware forecast for route weather timeline samples.
   * Bounds external calls; caches by provider + coarse lat/lon + hour bucket.
   * Returns null for a slot on failure (partial timeline).
   */
  async forecast(
    points: WeatherForecastRequest[],
  ): Promise<Array<WeatherObservation | null>> {
    // Soft bound — sampling already caps; defend against misuse.
    const bounded = points.slice(0, 12);
    const provider = this.config.get('WEATHER_PROVIDER', 'mock');
    const out: Array<WeatherObservation | null> = [];

    for (const p of bounded) {
      try {
        out.push(await this.forecastOne(p, provider));
      } catch {
        this.logger.warn('Weather forecast slot failed; marking partial');
        out.push(null);
      }
    }

    // Pad if we truncated (should not happen with sampling max=8).
    while (out.length < points.length) {
      out.push(null);
    }

    return out;
  }

  private async forecastOne(
    req: WeatherForecastRequest,
    provider: string,
  ): Promise<WeatherObservation> {
    const hourKey = req.at.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const cacheKey = `${provider}:t:${req.lat.toFixed(2)},${req.lon.toFixed(2)}:${hourKey}`;

    const cached = await this.prisma.weatherCache.findUnique({
      where: { cacheKey },
    });
    if (cached && cached.validUntil > new Date()) {
      const parsed = JSON.parse(cached.payloadJson) as WeatherObservation & {
        at: string;
        fetchedAt: string;
      };
      return {
        ...parsed,
        at: new Date(parsed.at),
        fetchedAt: new Date(parsed.fetchedAt),
      };
    }

    const observation =
      provider === 'met'
        ? await this.fetchMetAt(req.lat, req.lon, req.at)
        : this.mockWeatherAt(req.lat, req.lon, req.at);

    const validUntil = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.weatherCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        payloadJson: JSON.stringify({
          ...observation,
          at: observation.at.toISOString(),
          fetchedAt: observation.fetchedAt.toISOString(),
        }),
        validUntil,
      },
      update: {
        payloadJson: JSON.stringify({
          ...observation,
          at: observation.at.toISOString(),
          fetchedAt: observation.fetchedAt.toISOString(),
        }),
        validUntil,
      },
    });

    return observation;
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
  ): Promise<WeatherPoint> {
    const key = `${provider}:${lat.toFixed(3)},${lon.toFixed(3)}`;
    const cached = await this.prisma.weatherCache.findUnique({
      where: { cacheKey: key },
    });
    if (cached && cached.validUntil > new Date()) {
      return JSON.parse(cached.payloadJson) as WeatherPoint;
    }

    const point =
      provider === 'met'
        ? await this.fetchMet(lat, lon)
        : this.mockWeather(lat, lon);

    const validUntil = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.weatherCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        payloadJson: JSON.stringify(point),
        validUntil,
      },
      update: {
        payloadJson: JSON.stringify(point),
        validUntil,
      },
    });

    return point;
  }

  private mockWeather(lat: number, lon: number): WeatherPoint {
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
      // Intentionally omit windFromDeg — mock does not invent direction.
      symbol: precipitationProbPct > 50 ? 'rain' : 'fair',
    };
  }

  /** Time-aware mock: temperature/precip/wind vary with hour-of-day. */
  private mockWeatherAt(
    lat: number,
    lon: number,
    at: Date,
  ): WeatherObservation {
    const hour = at.getUTCHours() + at.getUTCMinutes() / 60;
    const day = at.getUTCMonth() * 30 + at.getUTCDate();
    const base = 8 + Math.sin((day / 365) * Math.PI * 2) * 10;
    const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 5;
    const jitter = ((Math.abs(lat * 1000 + lon * 100) % 7) - 3) * 0.4;
    const airTempC = Number((base + diurnal + jitter).toFixed(1));
    const precipitationProbability = Math.min(
      100,
      Math.max(
        0,
        (Math.abs(Math.floor(lat * 100 + day + hour)) % 70) +
          (hour >= 12 && hour <= 18 ? 15 : 0),
      ),
    );
    const precipitationMm =
      precipitationProbability > 50
        ? Number((precipitationProbability / 80).toFixed(2))
        : 0;
    const windSpeedMs =
      2 +
      (Math.abs(Math.floor(lon * 50 + day)) % 8) +
      (hour >= 14 ? 2 : 0);

    return {
      lat,
      lon,
      at,
      airTempC,
      windSpeedMs,
      // Intentionally omit windFromDeg — never invent direction.
      precipitationProbability,
      precipitationMm,
      conditionCode: precipitationProbability > 50 ? 'rain' : 'fair',
      source: 'mock',
      fetchedAt: new Date(),
      timeInterpolated: false,
    };
  }

  private async fetchMet(lat: number, lon: number): Promise<WeatherPoint> {
    const userAgent = this.config.get(
      'MET_USER_AGENT',
      'MotorcycleClothingApp/0.1 (dev)',
    );
    try {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        timeout: 8000,
      });
      const series = data?.properties?.timeseries?.[0]?.data;
      const instant = series?.instant?.details ?? {};
      const next1 = series?.next_1_hours ?? series?.next_6_hours ?? {};
      const windFrom =
        instant.wind_from_direction != null
          ? Number(instant.wind_from_direction)
          : null;
      return {
        lat,
        lon,
        airTempC: Number(instant.air_temperature ?? 0),
        precipitationProbPct: Number(
          next1?.details?.probability_of_precipitation ?? 0,
        ),
        precipitationMm: Number(next1?.details?.precipitation_amount ?? 0),
        windSpeedMs: Number(instant.wind_speed ?? 0),
        ...(windFrom != null && Number.isFinite(windFrom)
          ? { windFromDeg: windFrom }
          : {}),
        symbol: next1?.summary?.symbol_code,
      };
    } catch {
      this.logger.warn('MET fetch failed; using mock');
      return this.mockWeather(lat, lon);
    }
  }

  /**
   * MET locationforecast with time selection.
   * Picks the timeseries entry closest to `at` (marks timeInterpolated when not exact).
   * Does not invent wind direction when MET omits it.
   */
  private async fetchMetAt(
    lat: number,
    lon: number,
    at: Date,
  ): Promise<WeatherObservation> {
    const userAgent = this.config.get(
      'MET_USER_AGENT',
      'MotorcycleClothingApp/0.1 (dev)',
    );
    try {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        timeout: 8000,
      });
      const series: Array<{ time: string; data: unknown }> =
        data?.properties?.timeseries ?? [];
      if (series.length === 0) {
        return this.mockWeatherAt(lat, lon, at);
      }

      let best = series[0];
      let bestDelta = Math.abs(
        new Date(best.time).getTime() - at.getTime(),
      );
      for (const entry of series) {
        const delta = Math.abs(new Date(entry.time).getTime() - at.getTime());
        if (delta < bestDelta) {
          best = entry;
          bestDelta = delta;
        }
      }

      const entryData = best.data as {
        instant?: { details?: Record<string, number> };
        next_1_hours?: {
          details?: Record<string, number>;
          summary?: { symbol_code?: string };
        };
        next_6_hours?: {
          details?: Record<string, number>;
          summary?: { symbol_code?: string };
        };
      };
      const instant = entryData?.instant?.details ?? {};
      const next1 = entryData?.next_1_hours ?? entryData?.next_6_hours ?? {};
      const windFrom =
        instant.wind_from_direction != null
          ? Number(instant.wind_from_direction)
          : null;
      const exactMatch = bestDelta < 60_000; // within 1 minute

      return {
        lat,
        lon,
        at,
        airTempC: Number(instant.air_temperature ?? 0),
        windSpeedMs: Number(instant.wind_speed ?? 0),
        ...(windFrom != null && Number.isFinite(windFrom)
          ? { windFromDeg: windFrom }
          : {}),
        gustMs:
          instant.wind_speed_of_gust != null
            ? Number(instant.wind_speed_of_gust)
            : null,
        precipitationProbability: Number(
          next1?.details?.probability_of_precipitation ?? 0,
        ),
        precipitationMm: Number(next1?.details?.precipitation_amount ?? 0),
        conditionCode: next1?.summary?.symbol_code ?? null,
        source: 'met',
        fetchedAt: new Date(),
        timeInterpolated: !exactMatch,
      };
    } catch {
      this.logger.warn('MET timed forecast failed; using mock');
      return this.mockWeatherAt(lat, lon, at);
    }
  }
}
