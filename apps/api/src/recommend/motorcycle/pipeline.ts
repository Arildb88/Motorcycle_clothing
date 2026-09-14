import { MOTORCYCLE_EXPOSURE } from './constants';
import { computeConfidence } from './confidence';
import { computeDemand } from './demand';
import {
  buildRideSegments,
  durationWeightedMean,
  durationWeightedSpeedKmh,
} from './segments';
import type {
  ExposureSummary,
  GarmentInput,
  MotorcycleRecommendationResult,
  Reason,
  SpeedSource,
} from './types';
import { matchWardrobe } from './wardrobe-match';
import type { RouteTravelSegment } from './route-travel';
import type { RouteWeatherSummary } from '../weather.types';

export type PipelineInput = {
  weather: RouteWeatherSummary;
  wardrobe: GarmentInput[];
  rideDurationMin: number;
  /**
   * Explicit single cruise speed when no route profile is available.
   * null/undefined → assumed default (lowest speed confidence).
   */
  cruiseKmh?: number | null;
  /**
   * Provider-neutral route speed profile. When present, segment speeds
   * duration-weight exposure (preferred over cruiseKmh).
   */
  routeTravelSegments?: RouteTravelSegment[];
  personalColdBiasC?: number;
  personalSampleCount?: number;
  shrinkageK?: number;
};

/**
 * Motorcycle Recommendation Engine v1 pipeline.
 *
 * Weather/Route (+ optional speed profile) → Exposure →
 * Duration-weighted Demand → Wardrobe + Config Match →
 * Wear/Pack → Reason codes + Confidence
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

  const profile = (input.routeTravelSegments ?? []).filter(
    (s) => s.durationMin > 0 && Number.isFinite(s.expectedSpeedKmh),
  );
  const cruiseKnown =
    input.cruiseKmh != null && Number.isFinite(input.cruiseKmh);

  let speedSource: SpeedSource;
  let cruiseKmh: number;
  if (profile.length > 0) {
    speedSource = 'route_profile';
    cruiseKmh = durationWeightedSpeedKmh(profile);
  } else if (cruiseKnown) {
    speedSource = 'explicit_cruise';
    cruiseKmh = input.cruiseKmh as number;
  } else {
    speedSource = 'assumed_default';
    cruiseKmh = MOTORCYCLE_EXPOSURE.defaultCruiseKmh;
  }

  const segments = buildRideSegments({
    weather: input.weather,
    rideDurationMin: input.rideDurationMin,
    cruiseKmh: profile.length > 0 ? undefined : cruiseKmh,
    personalColdBiasC: input.personalColdBiasC ?? 0,
    routeTravelSegments: profile.length > 0 ? profile : undefined,
    speedSource,
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

  const windDirectionUsed = segments.some((s) => s.airflowMode === 'vector');

  const confidence = computeConfidence({
    weather: input.weather,
    wardrobe: input.wardrobe,
    speedSource,
    cruiseKmhKnown: cruiseKnown || speedSource === 'route_profile',
    windDirectionUsed,
    sampleCount: n,
  });

  const reasons = mergeReasons([
    ...demandReasons,
    ...matched.reasons,
    ...confidence.extra,
  ]);

  // M3 personalization boundary:
  // Shrinkage may bias exposure, but this engine does not emit personal
  // preference claims (those belong to M5). Below the claim gate, drop any
  // PERSONAL_* codes if present while keeping BASELINE_NO_PERSONAL_EVIDENCE.
  const filteredReasons = canClaimPersonal
    ? [...reasons]
    : reasons.filter((r) => !String(r.code).startsWith('PERSONAL_'));

  if (
    n === 0 &&
    !filteredReasons.some((r) => r.code === 'BASELINE_NO_PERSONAL_EVIDENCE')
  ) {
    filteredReasons.push({ code: 'BASELINE_NO_PERSONAL_EVIDENCE' });
  }

  const speeds = segments.map((s) => s.expectedSpeedKmh);
  const durationWeighted =
    Math.round(
      durationWeightedSpeedKmh(
        segments.map((s) => ({
          durationMin: s.durationMin,
          expectedSpeedKmh: s.expectedSpeedKmh,
        })),
      ) * 10,
    ) / 10;

  const exposure: ExposureSummary = {
    motorcycleExposureMinC: Math.min(
      ...segments.map((s) => s.motorcycleExposureC),
    ),
    motorcycleExposureMaxC: Math.max(
      ...segments.map((s) => s.motorcycleExposureC),
    ),
    motorcycleExposureSustainedC: Math.round(sustainedExposureC * 10) / 10,
    assumedCruiseKmh: durationWeighted,
    speedSource,
    durationWeightedSpeedKmh: durationWeighted,
    speedMinKmh: Math.min(...speeds),
    speedMaxKmh: Math.max(...speeds),
    windDirectionUsed,
    segments: segments.map((s) => ({
      index: s.index,
      durationMin: s.durationMin,
      airTempC: s.weather.airTempC,
      windSpeedMs: s.weather.windSpeedMs,
      expectedSpeedKmh: s.expectedSpeedKmh,
      apparentAirflowMs: s.apparentAirflowMs,
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
export {
  motorcycleExposureC,
  warmthDemandFromExposureC,
  windDemandFromPoint,
  waterDemandFromPoint,
} from './exposure';
export {
  buildRideSegments,
  durationWeightedMean,
} from './segments';
export { computeDemand } from './demand';
export { matchWardrobe } from './wardrobe-match';
export { computeConfidence } from './confidence';
export {
  computeApparentAirflow,
  type ApparentAirflow,
  type ApparentAirflowMode,
} from './airflow';
export {
  type RouteTravelSegment,
  type SpeedSource,
  routeTravelFromDurationDistance,
  durationWeightedSpeedKmh,
  associateWeatherIndex,
} from './route-travel';
