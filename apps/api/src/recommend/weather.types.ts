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
};
