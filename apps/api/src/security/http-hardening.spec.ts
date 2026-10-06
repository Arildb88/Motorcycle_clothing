import {
  isAllowedCorsOrigin,
  parseCorsOrigins,
  securityHeaders,
} from './http-hardening';

describe('HTTP hardening', () => {
  it('parses a comma-separated CORS allowlist', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins(' https://ride.example , ,http://localhost:8080 '))
      .toEqual(['https://ride.example', 'http://localhost:8080']);
  });

  it('allows missing Origin and configured browser origins', () => {
    const extraOrigins = ['https://ride.example'];
    expect(isAllowedCorsOrigin(undefined, { nodeEnv: 'production', extraOrigins })).toBe(
      true,
    );
    expect(
      isAllowedCorsOrigin('https://ride.example', {
        nodeEnv: 'production',
        extraOrigins,
      }),
    ).toBe(true);
    expect(
      isAllowedCorsOrigin('https://evil.example', {
        nodeEnv: 'production',
        extraOrigins,
      }),
    ).toBe(false);
  });

  it('allows localhost only outside production', () => {
    expect(
      isAllowedCorsOrigin('http://localhost:54321', { nodeEnv: 'development' }),
    ).toBe(true);
    expect(
      isAllowedCorsOrigin('http://127.0.0.1:3000', { nodeEnv: 'test' }),
    ).toBe(true);
    expect(
      isAllowedCorsOrigin('http://localhost:54321', { nodeEnv: 'production' }),
    ).toBe(false);
    expect(
      isAllowedCorsOrigin('http://10.0.2.2:3000', { nodeEnv: 'development' }),
    ).toBe(false);
  });

  it('sets baseline headers and HSTS only in production', () => {
    const dev = securityHeaders('development');
    expect(dev['X-Content-Type-Options']).toBe('nosniff');
    expect(dev['X-Frame-Options']).toBe('DENY');
    expect(dev['Content-Security-Policy']).toContain("default-src 'none'");
    expect(dev['Strict-Transport-Security']).toBeUndefined();

    const prod = securityHeaders('production');
    expect(prod['Strict-Transport-Security']).toContain('max-age=15552000');
  });
});
