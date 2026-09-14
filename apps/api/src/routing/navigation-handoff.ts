/**
 * External navigation handoff — architectural boundary only.
 *
 * RideWear analyzes routes for weather / exposure / clothing.
 * After the rider accepts a plan, the app may offer "Start navigation"
 * and hand destination (or ordered waypoints) to an external app:
 * Google Maps, Apple Maps, or another installed navigator.
 *
 * Domain stays provider-neutral — no Google/Apple types here.
 */

import type { GeoPoint } from './routing.types';

export type NavigationHandoffRequest = {
  waypoints: GeoPoint[];
  /** Optional labels for UX; navigators may ignore them. */
  labels?: Array<string | null | undefined>;
  /** Prefer motorcycle-capable travel mode when the target supports it. */
  preferMotorcycle?: boolean;
};

export type NavigationTarget =
  | 'system_default'
  | 'google_maps'
  | 'apple_maps'
  | 'other';

export type NavigationHandoffPayload = {
  target: NavigationTarget;
  /** Platform-specific URL or intent string built by the client adapter. */
  url: string;
};

/**
 * Client/API helper contract. Implementations live in Flutter (or thin API
 * helpers) — not inside the motorcycle recommendation engine.
 */
export interface NavigationHandoffPort {
  build(request: NavigationHandoffRequest): NavigationHandoffPayload[];
}

export const NAVIGATION_HANDOFF_PORT = Symbol('NAVIGATION_HANDOFF_PORT');
