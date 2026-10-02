import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RouteWeatherSummary, WeatherPoint } from '../recommend/weather.types';
import { selectMetTimeseriesIndex } from './met-timeseries';
import { metLocationForecastUrl, weatherCacheKey } from './met-request';

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

    const weatherPoints: WeatherPoint[] = [];
    for (const p of sampled) {
      weatherPoints.push(await this.pointWeather(p.lat, p.lon, provider));
    }

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

    const weatherPoints: WeatherPoint[] = [];
    for (const sample of usable) {
      const point = await this.pointWeather(
        sample.lat,
        sample.lon,
        provider,
        sample.at,
        sample.altitudeM,
      );
      weatherPoints.push(
        sample.at ? { ...point, forecastAt: sample.at.toISOString() } : point,
      );
    }

    return this.summarize(provider, weatherPoints);
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
      return JSON.parse(cached.payloadJson) as WeatherPoint;
    }

    const fetched =
      provider === 'met'
        ? await this.fetchMet(lat, lon, at, altitudeM)
        : this.mockWeather(lat, lon);
    const point = withGroundElevation(fetched, altitudeM);

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
        this.logger.warn(
          `MET fetch returned no temperature for ${lat},${lon}; using mock`,
        );
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
    } catch (err) {
      this.logger.warn(`MET fetch failed for ${lat},${lon}; using mock`);
      return this.mockWeather(lat, lon);
    }
  }
}

function withGroundElevation(
  point: WeatherPoint,
  altitudeM?: number | null,
): WeatherPoint {
  if (altitudeM == null || !Number.isFinite(altitudeM)) return point;
  return { ...point, groundElevationM: Math.round(altitudeM) };
}
