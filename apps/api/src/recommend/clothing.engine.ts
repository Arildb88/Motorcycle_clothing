/**
 * Legacy spike clothing engine — REMOVED in M3.
 * Weather types live in `./weather.types`.
 * Feedback bias helper retained for ActivityLog personalization scaffolding.
 *
 * Motorcycle recommendations: `./motorcycle` pipeline.
 */

export type {
  WeatherPoint,
  RouteWeatherSummary,
} from './weather.types';

export function biasDeltaFromRating(rating: string): number {
  switch (rating) {
    case 'too_cold':
      return 1;
    case 'slightly_cold':
      return 0.5;
    case 'ok':
      return 0;
    case 'slightly_warm':
      return -0.5;
    case 'too_warm':
      return -1;
    default:
      return 0;
  }
}
