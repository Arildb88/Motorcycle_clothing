/** Local fallback only. Production must set a unique JWT_SECRET. */
export const DEV_JWT_SECRET = 'dev-secret';

const KNOWN_WEAK_SECRETS = new Set([
  DEV_JWT_SECRET,
  'dev-change-me-motorcycle-clothing',
  'test-secret-motorcycle-clothing',
  'smoke-secret',
  'secret',
  'changeme',
  'change-me',
]);

/**
 * Production refuses missing, short, or known example secrets.
 * Other environments keep the existing dev fallback so local and CI login still work.
 */
export function resolveJwtSecret(
  raw: string | undefined | null,
  nodeEnv: string | undefined | null,
): string {
  const secret = (raw ?? '').trim();
  if (nodeEnv === 'production') {
    if (secret.length < 32 || KNOWN_WEAK_SECRETS.has(secret)) {
      throw new Error(
        'JWT_SECRET must be a unique value of at least 32 characters when NODE_ENV is production',
      );
    }
    return secret;
  }
  return secret || DEV_JWT_SECRET;
}
