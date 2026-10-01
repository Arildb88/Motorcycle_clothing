import type { RouteAnalysis, RoutingRequest } from './routing.types';

/**
 * Server-side routing port.
 *
 * NullRoutingAdapter synthesizes duration-weighted segments when no provider
 * is configured or the provider call fails.
 * OpenRouteServiceRoutingAdapter (HeiGIT, driving-car) is the v1 road adapter.
 *
 * Motorcycle recommend must depend on RouteAnalysis, not on this port's
 * provider identity.
 */
export interface RoutingPort {
  analyze(request: RoutingRequest): Promise<RouteAnalysis | null>;
}

export const ROUTING_PORT = Symbol('ROUTING_PORT');
