import { DEV_JWT_SECRET, resolveJwtSecret } from './jwt-secret';

describe('resolveJwtSecret', () => {
  const strong = 'production-only-secret-value-32b!!';

  it('keeps the dev fallback outside production', () => {
    expect(resolveJwtSecret(undefined, 'development')).toBe(DEV_JWT_SECRET);
    expect(resolveJwtSecret('', 'test')).toBe(DEV_JWT_SECRET);
    expect(resolveJwtSecret('local-secret', 'test')).toBe('local-secret');
  });

  it('accepts a long unique secret in production', () => {
    expect(resolveJwtSecret(strong, 'production')).toBe(strong);
  });

  it('rejects missing, short, and example secrets in production', () => {
    expect(() => resolveJwtSecret(undefined, 'production')).toThrow(/JWT_SECRET/);
    expect(() => resolveJwtSecret('short', 'production')).toThrow(/JWT_SECRET/);
    expect(() =>
      resolveJwtSecret('dev-change-me-motorcycle-clothing', 'production'),
    ).toThrow(/JWT_SECRET/);
    expect(() => resolveJwtSecret(DEV_JWT_SECRET, 'production')).toThrow(
      /JWT_SECRET/,
    );
  });
});
