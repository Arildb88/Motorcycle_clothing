export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-DNS-Prefetch-Control': 'off',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function securityHeaders(
  nodeEnv: string | undefined,
): Record<string, string> {
  const headers: Record<string, string> = { ...API_SECURITY_HEADERS };
  if (nodeEnv === 'production') {
    headers['Strict-Transport-Security'] =
      'max-age=15552000; includeSubDomains';
  }
  return headers;
}

export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Native clients omit Origin. Browsers must match CORS_ORIGINS.
 * Non-production also allows localhost so Flutter web on a dev machine still works.
 */
export function isAllowedCorsOrigin(
  origin: string | undefined,
  options: { nodeEnv?: string; extraOrigins?: string[] },
): boolean {
  if (!origin) return true;
  if ((options.extraOrigins ?? []).includes(origin)) return true;
  if (options.nodeEnv === 'production') return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}
