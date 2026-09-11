import { DEMAND_FROM_EXPOSURE_C } from './constants';
import { durationWeightedMean } from './segments';
import type {
  DemandSummary,
  Reason,
  RideSegment,
  ZoneDemand,
  ZoneId,
} from './types';

const ZONES: ZoneId[] = [
  'torso',
  'legs',
  'hands',
  'feet',
  'head',
  'neck',
];

function zoneDemand(
  zone: ZoneId,
  warmth: number,
  wind: number,
  water: number,
): ZoneDemand {
  let w = warmth;
  // Extremities feel cold sooner — bump one tier when already cool+.
  if (
    (zone === 'hands' || zone === 'feet' || zone === 'head' || zone === 'neck') &&
    warmth >= 2
  ) {
    w = Math.min(5, warmth + 1);
  }
  return {
    zone,
    warmth: clampTier(w),
    wind: clampTier(wind),
    water: clampTier(water),
  };
}

function clampTier(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * Duration-weighted sustained demand + peak/short-extreme signals.
 *
 * A short extreme must not equal a long extreme for WEAR, but may raise
 * peak demand used for PACK decisions.
 */
export function computeDemand(segments: RideSegment[]): {
  demand: DemandSummary;
  reasons: Reason[];
} {
  const reasons: Reason[] = [];
  const totalMin = segments.reduce((s, seg) => s + seg.durationMin, 0);

  const sustainedWarmthRaw = durationWeightedMean(
    segments.map((s) => ({ value: s.warmthDemand, weight: s.durationMin })),
  );
  const sustainedWindRaw = durationWeightedMean(
    segments.map((s) => ({ value: s.windDemand, weight: s.durationMin })),
  );
  const sustainedWaterRaw = durationWeightedMean(
    segments.map((s) => ({ value: s.waterDemand, weight: s.durationMin })),
  );

  const sustainedWarmth = clampTier(sustainedWarmthRaw);
  const sustainedWind = clampTier(sustainedWindRaw);
  const sustainedWater = clampTier(sustainedWaterRaw);

  const peakWarmth = clampTier(
    Math.max(sustainedWarmth, ...segments.map((s) => s.warmthDemand)),
  );
  const peakWind = clampTier(
    Math.max(sustainedWind, ...segments.map((s) => s.windDemand)),
  );
  const peakWater = clampTier(
    Math.max(sustainedWater, ...segments.map((s) => s.waterDemand)),
  );

  const shortExtremes = segments.filter((s) => s.isShortExtreme);
  const shortExtremeWarmth = shortExtremes.length
    ? clampTier(Math.max(...shortExtremes.map((s) => s.warmthDemand)))
    : sustainedWarmth;

  const shortExtremeInfluencesPackOnly =
    shortExtremes.length > 0 && peakWarmth > sustainedWarmth;

  const meanExposure = durationWeightedMean(
    segments.map((s) => ({
      value: s.motorcycleExposureC,
      weight: s.durationMin,
    })),
  );

  if (meanExposure >= DEMAND_FROM_EXPOSURE_C.mildAboveC && sustainedWater <= 1) {
    reasons.push({ code: 'MILD_CONDITIONS' });
  }
  if (meanExposure < DEMAND_FROM_EXPOSURE_C.coolBelowC) {
    reasons.push({
      code: 'LOW_EFFECTIVE_TEMPERATURE',
      params: { exposureC: Math.round(meanExposure * 10) / 10 },
    });
  }
  if (sustainedWarmth >= 3) {
    reasons.push({
      code: 'SUSTAINED_COLD_EXPOSURE',
      params: { durationMin: totalMin, warmth: sustainedWarmth },
    });
  }
  for (const s of shortExtremes) {
    if (s.warmthDemand > sustainedWarmth) {
      reasons.push({
        code: 'SHORT_COLD_SEGMENT',
        params: {
          durationMin: s.durationMin,
          exposureC: Math.round(s.motorcycleExposureC * 10) / 10,
        },
      });
      break;
    }
  }
  if (sustainedWater >= 3) {
    reasons.push({
      code: 'RAIN_PROTECTION_REQUIRED',
      params: { waterDemand: sustainedWater },
    });
  } else if (peakWater >= 3 && sustainedWater < 3) {
    reasons.push({
      code: 'PACK_RAIN_LAYER',
      params: { peakWater },
    });
  }
  if (sustainedWind >= 3) {
    reasons.push({
      code: 'HIGH_WIND_EXPOSURE',
      params: { windDemand: sustainedWind },
    });
  }
  const exposures = segments.map((s) => s.motorcycleExposureC);
  if (exposures.length >= 2) {
    const spread = Math.max(...exposures) - Math.min(...exposures);
    if (spread >= 8) {
      reasons.push({
        code: 'TEMPERATURE_VARIATION',
        params: { spreadC: Math.round(spread * 10) / 10 },
      });
    }
  }
  if (shortExtremeInfluencesPackOnly) {
    reasons.push({
      code: 'PACK_EXTRA_INSULATION',
      params: { peakWarmth, sustainedWarmth },
    });
  }

  const sustained: ZoneDemand[] = ZONES.map((z) =>
    zoneDemand(z, sustainedWarmth, sustainedWind, sustainedWater),
  );
  const peak: ZoneDemand[] = ZONES.map((z) =>
    zoneDemand(z, peakWarmth, peakWind, peakWater),
  );

  return {
    demand: {
      sustained,
      peak,
      shortExtremeWarmth,
      sustainedWarmth,
      peakWarmth,
      shortExtremeInfluencesPackOnly,
    },
    reasons: dedupe(reasons),
  };
}

function dedupe(reasons: Reason[]): Reason[] {
  const seen = new Set<string>();
  const out: Reason[] = [];
  for (const r of reasons) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    out.push(r);
  }
  return out;
}
