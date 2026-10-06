import { HttpException } from '@nestjs/common';
import {
  authRateLimitEnabled,
  clientAddress,
  enforceAuthRateLimit,
  SlidingWindowRateLimiter,
} from './auth-rate-limit';

describe('auth rate limit', () => {
  it('allows the window and then rejects the next attempt', () => {
    let now = 1_000;
    const limiter = new SlidingWindowRateLimiter(2, 1_000, () => now);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    const blocked = limiter.check('ip');
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSec).toBe(1);

    now = 2_001;
    expect(limiter.check('ip').allowed).toBe(true);
  });

  it('does not let a forwarded header replace the socket address', () => {
    expect(
      clientAddress({
        ip: '203.0.113.8',
        socket: { remoteAddress: '203.0.113.8' },
      }),
    ).toBe('203.0.113.8');
    expect(clientAddress({ socket: { remoteAddress: '10.1.1.1' } })).toBe(
      '10.1.1.1',
    );
  });

  it('is off for tests and when explicitly disabled', () => {
    expect(authRateLimitEnabled({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(
      false,
    );
    expect(
      authRateLimitEnabled({
        NODE_ENV: 'production',
        AUTH_RATE_LIMIT: 'off',
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      authRateLimitEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it('returns a stable 429 without echoing the request', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000, () => 10);
    const req = { ip: '198.51.100.10', path: '/api/auth/login' };
    enforceAuthRateLimit(req, limiter, true);
    expect(() => enforceAuthRateLimit(req, limiter, true)).toThrow(
      HttpException,
    );
    try {
      enforceAuthRateLimit(req, limiter, true);
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const http = err as HttpException;
      expect(http.getStatus()).toBe(429);
      expect(http.getResponse()).toEqual({
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Try again later.',
      });
    }
  });
});
