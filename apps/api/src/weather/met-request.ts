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
 * Cache namespace. `wx2` is not readable as an older `met:` or `series:met:`
 * key, so synthetic points stored under those keys are never reused.
 */
export const WEATHER_CACHE_NAMESPACE = 'wx2';

function weatherPlaceKey(input: {
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

/** Weather cache key. Older keys without this namespace are not read. */
export function weatherCacheKey(input: {
  provider: string;
  lat: number;
  lon: number;
  at?: Date;
  altitudeM?: number | null;
}): string {
  return `${WEATHER_CACHE_NAMESPACE}:${weatherPlaceKey(input)}`;
}

/**
 * One locationforecast payload covers every hour at this place.
 * The key has no ETA, so a departure comparison can reuse it.
 * The `series:` prefix keeps it distinct from a cached weather point.
 */
export function weatherSeriesCacheKey(input: {
  provider: string;
  lat: number;
  lon: number;
  altitudeM?: number | null;
}): string {
  return `${WEATHER_CACHE_NAMESPACE}:series:${weatherPlaceKey({
    provider: input.provider,
    lat: input.lat,
    lon: input.lon,
    altitudeM: input.altitudeM,
  })}`;
}
