/** Current HeiGIT OpenRouteService host. Do not use api.openrouteservice.org. */
export const HEIGIT_ORS_BASE_URL = 'https://api.heigit.org/openrouteservice';

/** Pelias geocoding on HeiGIT (not under the /openrouteservice prefix). */
export const HEIGIT_PELIAS_BASE_URL = 'https://api.heigit.org/pelias/v1';

/** Road-following driving geometry. Not a cycling route. */
export const ORS_DRIVING_DIRECTIONS_PROFILE = 'driving-car';

/**
 * HeiGIT's general cycling profile.
 * CYCLING_PLAN still leaves cycling-regular vs cycling-road vs cycling-mountain
 * unsettled for Norwegian mixed commuting. This is the general profile used
 * for weather sampling, not a claim that the Norway choice is decided.
 */
export const ORS_CYCLING_DIRECTIONS_PROFILE = 'cycling-regular';

export const DRIVING_GEOMETRY_NOTICE_CODE = 'DRIVING_GEOMETRY';

export const DRIVING_GEOMETRY_NOTICE =
  'Road-following driving geometry. This route is not motorcycle-optimized.';

const DEPRECATED_ORS_HOST = 'api.openrouteservice.org';

export function resolveOrsBaseUrl(configured?: string | null): string {
  return sanitizeBaseUrl(configured, HEIGIT_ORS_BASE_URL);
}

export function resolvePeliasBaseUrl(configured?: string | null): string {
  return sanitizeBaseUrl(configured, HEIGIT_PELIAS_BASE_URL);
}

function sanitizeBaseUrl(configured: string | null | undefined, fallback: string): string {
  const raw = (configured ?? '').trim().replace(/\/+$/, '');
  if (!raw || raw.includes(DEPRECATED_ORS_HOST)) return fallback;
  return raw;
}
