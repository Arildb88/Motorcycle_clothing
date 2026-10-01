/**
 * Provider-neutral weather port.
 *
 * Adapters (mock, MET, Open-Meteo, …) map into WeatherObservation.
 * Motorcycle recommendation must never depend on provider response DTOs.
 */

export type WeatherObservation = {
  lat: number;
  lon: number;
  /** Instant the observation represents (UTC). */
  at: Date;
  airTempC: number;
  windSpeedMs: number;
  /** Meteorological wind FROM direction (deg). Omit/null when unknown — never invent. */
  windFromDeg?: number | null;
  gustMs?: number | null;
  /** 0–100 when known. */
  precipitationProbability?: number | null;
  precipitationMm?: number | null;
  /** Provider condition / symbol code when known. */
  conditionCode?: string | null;
  source: string;
  fetchedAt: Date;
  /**
   * True when the provider returned a nearby time step rather than an exact match.
   * Does not imply invented weather values.
   */
  timeInterpolated?: boolean;
};

export type WeatherForecastRequest = {
  lat: number;
  lon: number;
  at: Date;
};

export interface WeatherPort {
  /**
   * Forecast (or nowcast) at specific places and times.
   * Implementations SHOULD bound external calls and may batch when the provider allows.
   * Return null for a slot when lookup fails — callers handle partial timelines.
   */
  forecast(
    points: WeatherForecastRequest[],
  ): Promise<Array<WeatherObservation | null>>;
}

export const WEATHER_PORT = Symbol('WEATHER_PORT');
