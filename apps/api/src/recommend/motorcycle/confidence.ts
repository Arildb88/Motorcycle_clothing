import type { ConfidenceLevel, Reason, ReasonCode, SpeedSource } from './types';
import type { RouteWeatherSummary } from '../weather.types';
import type { GarmentInput } from './types';

export function computeConfidence(input: {
  weather: RouteWeatherSummary;
  wardrobe: GarmentInput[];
  /** @deprecated Prefer speedSource */
  cruiseKmhKnown?: boolean;
  speedSource?: SpeedSource;
  windDirectionUsed?: boolean;
  sampleCount: number;
}): { level: ConfidenceLevel; reasons: ReasonCode[]; extra: Reason[] } {
  const reasons: ReasonCode[] = [];
  let score = 0;

  const pointCount = input.weather.points.length;
  if (pointCount >= 3) score += 2;
  else if (pointCount >= 1) score += 1;
  else {
    score -= 1;
    reasons.push('INCOMPLETE_WEATHER');
  }

  const speedSource: SpeedSource =
    input.speedSource ??
    (input.cruiseKmhKnown ? 'explicit_cruise' : 'assumed_default');

  if (speedSource === 'route_profile') {
    score += 2;
    reasons.push('ROUTE_SPEED_PROFILE_USED');
  } else if (speedSource === 'explicit_cruise') {
    score += 1;
    reasons.push('ROUTE_SPEED_PROFILE_UNAVAILABLE');
  } else {
    reasons.push('ASSUMED_CRUISE_SPEED');
    reasons.push('ROUTE_SPEED_PROFILE_UNAVAILABLE');
  }

  if (input.windDirectionUsed === false) {
    reasons.push('WIND_DIRECTION_UNAVAILABLE');
  }

  const tagged = input.wardrobe.filter((g) =>
    g.activityTags.includes('motorcycle'),
  );
  if (input.wardrobe.length === 0) {
    score -= 2;
    reasons.push('INCOMPLETE_WARDROBE');
  } else if (tagged.length < 3) {
    score -= 1;
    reasons.push('INCOMPLETE_WARDROBE');
  } else {
    score += 2;
  }

  const incompleteProps = input.wardrobe.filter(
    (g) =>
      !g.warmthTier ||
      !g.windResistTier ||
      !g.waterResistTier,
  );
  if (incompleteProps.length > input.wardrobe.length / 2) {
    score -= 1;
    reasons.push('INCOMPLETE_WARDROBE');
  }

  if (input.sampleCount === 0) {
    reasons.push('BASELINE_NO_PERSONAL_EVIDENCE');
  } else if (input.sampleCount >= 3) {
    score += 1;
  }

  let level: ConfidenceLevel = 'MEDIUM';
  if (score <= 1) level = 'LOW';
  else if (score >= 5) level = 'HIGH';
  else if (score >= 4) level = 'HIGH';

  const unique = [...new Set(reasons)];
  const extra: Reason[] = unique.map((code) => ({ code }));
  return { level, reasons: unique, extra };
}
