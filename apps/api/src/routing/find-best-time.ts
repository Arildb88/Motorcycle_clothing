/**
 * Find My Best Time — architectural boundary only (not implemented).
 *
 * Future behavior: given a preferred departure or arrival anchor, evaluate
 * several nearby candidate times and rank them with RideWear-specific
 * ride comfort criteria (rain, temperature, wind/gusts, route-aware airflow,
 * high-speed exposure, duration, meaningful weather change along the ride).
 *
 * Results must be explainable via language-neutral reason codes — not a
 * opaque proprietary "weather score".
 */

import type { PlanningMode } from '../domain/ride-planning';
import type { RouteAnalysis } from './routing.types';

export type BestTimeCriteria = {
  /** Prefer drier / less rain probability. */
  rain: boolean;
  temperature: boolean;
  wind: boolean;
  gusts: boolean;
  /** Uses route-aware apparent airflow / high-speed exposure. */
  routeAirflow: boolean;
  routeDuration: boolean;
};

export type BestTimeCandidate = {
  planningMode: PlanningMode;
  departureAt: string;
  arrivalAt: string;
  /** Explainable ordinal or ranked score — never a black-box 0–100 alone. */
  rank: number;
  reasonCodes: string[];
  /** Optional per-criterion diagnostics for UI. */
  diagnostics?: Record<string, number | string | boolean>;
};

export type BestTimeRequest = {
  planningMode: PlanningMode;
  /** Preferred anchor time (departure or arrival depending on mode). */
  preferredAt: Date;
  /** Window to search around the preferred time (minutes). */
  windowMin: number;
  /** Step between candidates (minutes). */
  stepMin: number;
  routeAnalysis: RouteAnalysis;
  criteria?: Partial<BestTimeCriteria>;
};

export type BestTimeResult = {
  candidates: BestTimeCandidate[];
  selected?: BestTimeCandidate;
};

/**
 * Port for the future Find My Best Time service.
 * Do not implement ranking logic in this foundation PR.
 */
export interface FindBestTimePort {
  evaluate(request: BestTimeRequest): Promise<BestTimeResult>;
}

export const FIND_BEST_TIME_PORT = Symbol('FIND_BEST_TIME_PORT');
