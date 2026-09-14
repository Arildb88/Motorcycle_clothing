import type { RouteAnalysis, RoutingRequest } from './routing.types';

/**
 * Server-side routing port.
 *
 * MVP: NullRoutingAdapter synthesizes duration-weighted segments from
 * waypoints + duration without calling an external provider.
 * Later: Google / Mapbox / ORS adapters implement the same contract.
 *
 * Motorcycle recommend must depend on RouteAnalysis, not on this port's
 * provider identity.
 */
export interface RoutingPort {
  analyze(request: RoutingRequest): Promise<RouteAnalysis | null>;
}

export const ROUTING_PORT = Symbol('ROUTING_PORT');
