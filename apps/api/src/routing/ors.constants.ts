/** Current HeiGIT OpenRouteService host. Do not use api.openrouteservice.org. */
export const HEIGIT_ORS_BASE_URL = 'https://api.heigit.org/openrouteservice';

/** Pelias geocoding on HeiGIT (not under the /openrouteservice prefix). */
export const HEIGIT_PELIAS_BASE_URL = 'https://api.heigit.org/pelias/v1';

export const DRIVING_GEOMETRY_NOTICE_CODE = 'DRIVING_GEOMETRY';

export const DRIVING_GEOMETRY_NOTICE =
  'Road-following driving geometry. This route is not motorcycle-optimized.';

/** HeiGIT profile name. Driving requests stay on this profile. */
export const ORS_DRIVING_CAR_PROFILE = 'driving-car';

/**
 * Interim generic cycling profile.
 * Which Norwegian commuting profile should be the default is still an open
 * question in the cycling plan. This is not a surface-quality guarantee.
 */
export const ORS_CYCLING_REGULAR_PROFILE = 'cycling-regular';

export const CYCLING_GEOMETRY_NOTICE_CODE = 'CYCLING_GEOMETRY';

export const CYCLING_GEOMETRY_NOTICE =
  'Cycling-profile geometry from the interim cycling-regular profile. This is not a surface-quality guarantee.';

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
