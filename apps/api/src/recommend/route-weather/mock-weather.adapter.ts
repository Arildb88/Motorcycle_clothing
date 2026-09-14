/**
 * Deterministic WeatherPort for tests and local CI.
 *
 * Temperature/precip/wind vary by lat/lon AND by hour-of-day so different
 * expected timestamps along a route produce different observations.
 * Wind direction is only emitted when `includeWindDirection` is true —
 * never invented by default.
 */

import type {
  WeatherForecastRequest,
  WeatherObservation,
  WeatherPort,
} from '../../weather/weather.port';

export type MockWeatherAdapterOptions = {
  /** When false (default), windFromDeg is omitted. */
  includeWindDirection?: boolean;
  /** Force null for specific request indices (partial timeline tests). */
  failIndexes?: number[];
  source?: string;
};

export class MockWeatherAdapter implements WeatherPort {
  constructor(private readonly options: MockWeatherAdapterOptions = {}) {}

  async forecast(
    points: WeatherForecastRequest[],
  ): Promise<Array<WeatherObservation | null>> {
    const fail = new Set(this.options.failIndexes ?? []);
    return points.map((p, i) => {
      if (fail.has(i)) return null;
      return this.observe(p);
    });
  }

  /** Pure deterministic observation for a single request. */
  observe(req: WeatherForecastRequest): WeatherObservation {
    const hour = req.at.getUTCHours() + req.at.getUTCMinutes() / 60;
    const day =
      req.at.getUTCMonth() * 30 +
      req.at.getUTCDate() +
      req.at.getUTCFullYear() * 0.001;

    const spatial =
      ((Math.abs(req.lat * 1000) + Math.abs(req.lon * 100)) % 11) - 5;
    const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 6;
    const airTempC = Number(
      (8 + spatial * 0.4 + diurnal + (day % 3)).toFixed(1),
    );

    const rainBase = Math.abs(Math.floor(req.lat * 50 + hour * 3)) % 100;
    const precipitationProbability = Math.min(
      100,
      Math.max(0, rainBase - 20 + (hour >= 12 && hour <= 18 ? 25 : 0)),
    );
    const precipitationMm =
      precipitationProbability > 50
        ? Number((precipitationProbability / 80).toFixed(2))
        : 0;

    const windSpeedMs = Number(
      (
        2 +
        (Math.abs(Math.floor(req.lon * 40 + hour)) % 10) +
        (hour >= 14 ? 3 : 0)
      ).toFixed(1),
    );

    const obs: WeatherObservation = {
      lat: req.lat,
      lon: req.lon,
      at: req.at,
      airTempC,
      windSpeedMs,
      precipitationProbability,
      precipitationMm,
      conditionCode: precipitationProbability > 50 ? 'rain' : 'fair',
      source: this.options.source ?? 'mock',
      fetchedAt: new Date(0),
      timeInterpolated: false,
    };

    if (this.options.includeWindDirection) {
      obs.windFromDeg =
        Math.abs(Math.floor(req.lat * 10 + req.lon * 7 + hour)) % 360;
    }

    return obs;
  }
}

/**
 * Scripted WeatherPort: returns caller-supplied observations by index.
 * Ideal for scenario tests (dry→rain, cold–mild–cold, etc.).
 */
export class ScriptedWeatherAdapter implements WeatherPort {
  constructor(
    private readonly script: Array<Partial<WeatherObservation> | null>,
  ) {}

  async forecast(
    points: WeatherForecastRequest[],
  ): Promise<Array<WeatherObservation | null>> {
    return points.map((p, i) => {
      const partial =
        i < this.script.length
          ? this.script[i]
          : this.script[this.script.length - 1];
      if (partial == null) return null;
      return this.merge(p, partial);
    });
  }

  private merge(
    req: WeatherForecastRequest,
    partial: Partial<WeatherObservation>,
  ): WeatherObservation {
    return {
      lat: req.lat,
      lon: req.lon,
      at: req.at,
      airTempC: partial.airTempC ?? 12,
      windSpeedMs: partial.windSpeedMs ?? 3,
      windFromDeg: partial.windFromDeg,
      gustMs: partial.gustMs,
      precipitationProbability: partial.precipitationProbability ?? 0,
      precipitationMm: partial.precipitationMm ?? 0,
      conditionCode: partial.conditionCode ?? 'fair',
      source: partial.source ?? 'scripted',
      fetchedAt: partial.fetchedAt ?? new Date(0),
      timeInterpolated: partial.timeInterpolated ?? false,
    };
  }
}
