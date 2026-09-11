import { MOTORCYCLE_EXPOSURE } from './constants';
import { computeConfidence } from './confidence';
import { computeDemand } from './demand';
import { buildRideSegments, durationWeightedMean } from './segments';
import type {
  ExposureSummary,
  GarmentInput,
  MotorcycleRecommendationResult,
  Reason,
} from './types';
import { matchWardrobe } from './wardrobe-match';
import type { RouteWeatherSummary } from '../weather.types';

export type PipelineInput = {
  weather: RouteWeatherSummary;
  wardrobe: GarmentInput[];
  rideDurationMin: number;
  /** When null/undefined, default cruise is assumed (reduces confidence). */
  cruiseKmh?: number | null;
  personalColdBiasC?: number;
  personalSampleCount?: number;
  shrinkageK?: number;
};

/**
 * Motorcycle Recommendation Engine v1 pipeline.
 *
 * Weather/Route → Exposure → Duration-weighted Demand →
 * Wardrobe + Config Match → Wear/Pack → Reason codes + Confidence
 *
 * Motorcycle-specific: do not reuse this module for hiking/cycling engines.
 */
export function runMotorcycleRecommendationPipeline(
  input: PipelineInput,
): MotorcycleRecommendationResult {
  const k = input.shrinkageK ?? MOTORCYCLE_EXPOSURE.personalShrinkageK;
  const n = input.personalSampleCount ?? 0;
  const personalWeight = n / (n + k);
  const canClaimPersonal = n >= MOTORCYCLE_EXPOSURE.personalClaimMinN;

  const cruiseKnown = input.cruiseKmh != null && Number.isFinite(input.cruiseKmh);
  const cruiseKmh = cruiseKnown
    ? (input.cruiseKmh as number)
    : MOTORCYCLE_EXPOSURE.defaultCruiseKmh;

  const segments = buildRideSegments({
    weather: input.weather,
    rideDurationMin: input.rideDurationMin,
    cruiseKmh,
    personalColdBiasC: input.personalColdBiasC ?? 0,
  });

  const { demand, reasons: demandReasons } = computeDemand(segments);

  const sustainedExposureC = durationWeightedMean(
    segments.map((s) => ({
      value: s.motorcycleExposureC,
      weight: s.durationMin,
    })),
  );

  const peakWater = demand.peak.find((z) => z.zone === 'torso')?.water ?? 1;
  const sustainedWater =
    demand.sustained.find((z) => z.zone === 'torso')?.water ?? 1;
  const packRain =
    demandReasons.some((r) => r.code === 'PACK_RAIN_LAYER') ||
    (peakWater >= 3 && sustainedWater < 3);

  const packWarmth = demand.shortExtremeInfluencesPackOnly;

  const matched = matchWardrobe({
    demand,
    wardrobe: input.wardrobe,
    sustainedExposureC,
    packWarmth,
    packRain,
  });

  const confidence = computeConfidence({
    weather: input.weather,
    wardrobe: input.wardrobe,
    cruiseKmhKnown: cruiseKnown,
    sampleCount: n,
  });

  const reasons = mergeReasons([
    ...demandReasons,
    ...matched.reasons,
    ...confidence.extra,
  ]);

  // New users: never emit personal claim codes.
  const filteredReasons = canClaimPersonal
    ? reasons
    : reasons.filter(
        (r) =>
          r.code !== 'BASELINE_NO_PERSONAL_EVIDENCE' ||
          true, // keep baseline marker
      );

  // Ensure baseline marker present when n=0.
  if (n === 0 && !filteredReasons.some((r) => r.code === 'BASELINE_NO_PERSONAL_EVIDENCE')) {
    filteredReasons.push({ code: 'BASELINE_NO_PERSONAL_EVIDENCE' });
  }

  const exposure: ExposureSummary = {
    motorcycleExposureMinC: Math.min(
      ...segments.map((s) => s.motorcycleExposureC),
    ),
    motorcycleExposureMaxC: Math.max(
      ...segments.map((s) => s.motorcycleExposureC),
    ),
    motorcycleExposureSustainedC: Math.round(sustainedExposureC * 10) / 10,
    assumedCruiseKmh: cruiseKmh,
    segments: segments.map((s) => ({
      index: s.index,
      durationMin: s.durationMin,
      airTempC: s.weather.airTempC,
      windSpeedMs: s.weather.windSpeedMs,
      motorcycleExposureC: Math.round(s.motorcycleExposureC * 10) / 10,
      isShortExtreme: s.isShortExtreme,
    })),
  };

  return {
    engine: 'motorcycle_v1',
    exposure,
    demand,
    wear: matched.wear,
    pack: matched.pack,
    reasons: filteredReasons,
    confidence: {
      level: confidence.level,
      reasons: confidence.reasons,
    },
    personalization: {
      voice: canClaimPersonal ? 'personal' : 'baseline',
      sampleCount: n,
      shrinkageK: k,
      personalWeight,
      canClaimPersonal,
    },
  };
}

function mergeReasons(reasons: Reason[]): Reason[] {
  const seen = new Set<string>();
  const out: Reason[] = [];
  for (const r of reasons) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    out.push(r);
  }
  return out;
}

export * from './types';
export * from './constants';
export { motorcycleExposureC, warmthDemandFromExposureC } from './exposure';
export { buildRideSegments } from './segments';
export { computeDemand } from './demand';
export { matchWardrobe } from './wardrobe-match';
export { computeConfidence } from './confidence';
