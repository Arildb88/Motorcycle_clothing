import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

type LimitedRequest = {
  ip?: string;
  path?: string;
  url?: string;
  socket?: { remoteAddress?: string };
};

/** Credential endpoints. In-memory and per process; not a shared lockout store. */
export const AUTH_RATE_LIMIT = 20;
export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  check(key: string): RateLimitDecision {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (ts) => now - ts < this.windowMs,
    );
    if (recent.length >= this.limit) {
      const oldest = recent[0] ?? now;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((this.windowMs - (now - oldest)) / 1000),
      );
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSec };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true };
  }
}

const authLimiter = new SlidingWindowRateLimiter(
  AUTH_RATE_LIMIT,
  AUTH_RATE_WINDOW_MS,
);

export function authRateLimitEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.AUTH_RATE_LIMIT === 'off') return false;
  if (env.NODE_ENV === 'test') return false;
  return true;
}

export function clientAddress(req: LimitedRequest): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function enforceAuthRateLimit(
  req: LimitedRequest,
  limiter: SlidingWindowRateLimiter = authLimiter,
  enabled = authRateLimitEnabled(),
): void {
  if (!enabled) return;
  const path = req.path || req.url || 'auth';
  const decision = limiter.check(`${clientAddress(req)}:${path}`);
  if (!decision.allowed) {
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Try again later.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    enforceAuthRateLimit(
      context.switchToHttp().getRequest<LimitedRequest>(),
    );
    return true;
  }
}
