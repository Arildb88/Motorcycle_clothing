import type { RoutingPort } from './routing.port';
import type { RouteAnalysis, RoutingRequest } from './routing.types';

/**
 * App routing port when OpenRouteService is not configured.
 * It does not estimate distance or travel time.
 */
export class UnavailableRoutingAdapter implements RoutingPort {
  constructor(
    readonly reason: 'not_configured' | 'provider' = 'not_configured',
  ) {}

  analyze(_request: RoutingRequest): Promise<RouteAnalysis | null> {
    return Promise.resolve(null);
  }
}
