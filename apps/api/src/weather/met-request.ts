/** Locationforecast compact URL. `altitude` is whole metres of ground height. */
export function metLocationForecastUrl(
  lat: number,
  lon: number,
  altitudeM?: number | null,
): string {
  const base = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  if (altitudeM == null || !Number.isFinite(altitudeM)) return base;
  return `${base}&altitude=${Math.round(altitudeM)}`;
}

/**
 * Weather cache key. Omitting altitude or ETA keeps the previous key shape
 * so existing cached forecasts still match.
 */
export function weatherCacheKey(input: {
  provider: string;
  lat: number;
  lon: number;
  at?: Date;
  altitudeM?: number | null;
}): string {
  const place = `${input.provider}:${input.lat.toFixed(3)},${input.lon.toFixed(3)}`;
  const altitude =
    input.altitudeM != null && Number.isFinite(input.altitudeM)
      ? `@${Math.round(input.altitudeM)}m`
      : '';
  const hour =
    input.at && !Number.isNaN(input.at.getTime())
      ? `@${input.at.toISOString().slice(0, 13)}`
      : '';
  return `${place}${altitude}${hour}`;
}
