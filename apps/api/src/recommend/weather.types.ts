/** Shared weather summary types used by WeatherService and recommend engines. */

export function finiteWeatherNumber(
  value: number | null | undefined,
): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Highest finite value. An empty or all-missing list stays null, not 0. */
export function maxFiniteWeatherNumber(
  values: Array<number | null | undefined>,
): number | null {
  let max: number | null = null;
  for (const value of values) {
    const finite = finiteWeatherNumber(value);
    if (finite == null) continue;
    max = max == null ? finite : Math.max(max, finite);
  }
  return max;
}

export function precipitationProbAtLeast(
  value: number | null | undefined,
  threshold: number,
): boolean {
  const finite = finiteWeatherNumber(value);
  return finite != null && finite >= threshold;
}

export type WeatherPoint = {
  lat: number;
  lon: number;
  airTempC: number;
  /** Null when MET did not send a probability. A missing value is not 0. */
  precipitationProbPct: number | null;
  precipitationMm: number;
  windSpeedMs: number;
  /**
   * Optional meteorological wind FROM direction (degrees clockwise from north).
   * Never invent this — omit when the weather provider does not supply it.
   */
  windFromDeg?: number | null;
  symbol?: string;
  /** Set only after MET returned this point. A config label is not a source. */
  source?: 'met';
  /** ISO time of the MET timeseries step that supplied this point. */
  forecastValidAt?: string;
  /** ISO time the forecast was selected for, when the sample has an ETA. */
  forecastAt?: string;
  /** Ground height in whole metres used for this forecast, when known. */
  groundElevationM?: number;
};

export type WeatherAvailability = 'available' | 'partial' | 'unavailable';

export type WeatherFailureReason =
  | 'configuration'
  | 'timeout'
  | 'empty'
  | 'missing_fields'
  | 'out_of_range'
  | 'provider'
  | 'missing';

export type RouteWeatherSummary = {
  provider: string;
  /**
   * `available` only after MET returned every requested sample.
   * Omitted on older fixtures. A present status other than `available`
   * must not be dressed as a complete forecast.
   */
  status?: WeatherAvailability;
  reason?: WeatherFailureReason;
  /** Present only when the points were retrieved from MET. */
  source?: 'met';
  /** Earliest MET step used. This is not the configured provider name. */
  forecastValidAt?: string;
  sampledAt: string;
  points: WeatherPoint[];
  minTempC: number;
  maxTempC: number;
  /** Null when MET did not send a precipitation probability. */
  maxRainProbPct: number | null;
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
  | { available: false; reason: WeatherFailureReason };
