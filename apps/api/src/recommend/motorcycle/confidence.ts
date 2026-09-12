import type { ConfidenceLevel, Reason, ReasonCode } from './types';
import type { RouteWeatherSummary } from '../weather.types';
import type { GarmentInput } from './types';

export function computeConfidence(input: {
  weather: RouteWeatherSummary;
  wardrobe: GarmentInput[];
  cruiseKmhKnown: boolean;
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

  if (input.cruiseKmhKnown) score += 1;
  else score -= 0; // assumed cruise is OK but not ideal

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
  else if (score >= 4) level = 'HIGH';

  const extra: Reason[] = reasons.map((code) => ({ code }));
  return { level, reasons: [...new Set(reasons)], extra };
}
