/** Shared weather summary types used by WeatherService and recommend engines. */

export type WeatherPoint = {
  lat: number;
  lon: number;
  airTempC: number;
  precipitationProbPct: number;
  precipitationMm: number;
  windSpeedMs: number;
  /**
   * Optional meteorological wind FROM direction (degrees clockwise from north).
   * Never invent this — omit when the weather provider does not supply it.
   */
  windFromDeg?: number | null;
  symbol?: string;
  /** ISO time the forecast was selected for, when the sample has an ETA. */
  forecastAt?: string;
  /** Ground height in whole metres used for this forecast, when known. */
  groundElevationM?: number;
};

export type RouteWeatherSummary = {
  provider: string;
  sampledAt: string;
  points: WeatherPoint[];
  minTempC: number;
  maxTempC: number;
  maxRainProbPct: number;
  maxPrecipMm: number;
  maxWindMs: number;
  /** Set when a ground-elevation source returned at least one height. */
  elevation?: { provider: string; attribution: string } | null;
};

/**
 * One commute leg's forecast.
 * Unavailable means that leg has no forecast. Callers must not fill it
 * from another leg or another time.
 */
export type LegForecast =
  | { available: true; weather: RouteWeatherSummary }
  | { available: false; reason: 'missing' | 'out_of_range' };
