import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import {
  RouteWeatherSummary,
  WeatherPoint,
} from '../recommend/weather.types';

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
      points.length > 0
        ? points
        : [{ lat: 59.9139, lon: 10.7522 }];

    // Always include start, mid (if multiple), end
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
    // Deterministic-ish mock from coordinates + day of year
    const day = new Date().getMonth() * 30 + new Date().getDate();
    const base = 8 + Math.sin((day / 365) * Math.PI * 2) * 10;
    const jitter = ((Math.abs(lat * 1000 + lon * 100) % 7) - 3) * 0.4;
    const airTempC = Number((base + jitter).toFixed(1));
    const precipitationProbPct = (Math.abs(Math.floor(lat * 100 + day)) % 70);
    const precipitationMm =
      precipitationProbPct > 50 ? Number((precipitationProbPct / 80).toFixed(2)) : 0;
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
      return {
        lat,
        lon,
        airTempC: Number(instant.air_temperature ?? 0),
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
