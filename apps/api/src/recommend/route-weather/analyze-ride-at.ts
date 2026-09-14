/**
 * analyzeRideAt — single entry point for time-aware ride weather analysis.
 *
 * Find My Best Time must call this (or buildRouteWeatherTimeline) for each
 * candidate time — not a separate approximation engine.
 */

import type { PlanningMode } from '../../domain/ride-planning';
import type { RouteAnalysis } from '../../routing/routing.types';
import type { WeatherPort } from '../../weather/weather.port';
import { buildRouteWeatherTimeline } from './timeline';
import {
  timelineToPipelineInput,
  type TimelinePipelineInput,
} from './to-pipeline';
import {
  toRouteWeatherTimelineSummary,
  type RouteWeatherTimeline,
  type RouteWeatherTimelineSummaryV1,
} from './types';
import { ROUTE_WEATHER_SAMPLING } from './sampling';

export type AnalyzeRideAtInput = {
  analysis: RouteAnalysis;
  weatherPort: WeatherPort;
  planningMode: PlanningMode;
  /** Departure or arrival anchor depending on planningMode. */
  anchorAt: Date;
  now?: Date;
  sampling?: Partial<typeof ROUTE_WEATHER_SAMPLING>;
};

export type AnalyzeRideAtResult = {
  timeline: RouteWeatherTimeline;
  /** Compact summary safe to persist on ActivityPlan / WeatherSnapshot. */
  summary: RouteWeatherTimelineSummaryV1;
  /** Ready for runMotorcycleRecommendationPipeline. */
  pipeline: TimelinePipelineInput;
};

/**
 * Analyze weather along a route at a specific planned time.
 *
 * Reusable for:
 * - /recommend for a planned departure/arrival
 * - future Find My Best Time candidate evaluation
 */
export async function analyzeRideAt(
  input: AnalyzeRideAtInput,
): Promise<AnalyzeRideAtResult> {
  const timeline = await buildRouteWeatherTimeline({
    analysis: input.analysis,
    weatherPort: input.weatherPort,
    planningMode: input.planningMode,
    anchorAt: input.anchorAt,
    now: input.now,
    sampling: input.sampling,
  });

  return {
    timeline,
    summary: toRouteWeatherTimelineSummary(timeline),
    pipeline: timelineToPipelineInput(timeline),
  };
}
