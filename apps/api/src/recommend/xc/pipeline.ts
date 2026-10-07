import { withZoneColdBias, type ZoneColdBiasC } from '../../domain';
import { XC_EXPOSURE, XC_INTENSITIES, XC_STYLES } from './constants';
import type { XcIntensity, XcStyle } from './constants';
import {
  xcExposureC,
  xcSampleIsClimbing,
  xcWarmthDemand,
  xcWaterDemand,
  xcWindDemand,
} from './exposure';
import { isXcGarment, matchXcKit } from './kit';
import type {
  XcConfidenceLevel,
  XcDemandSummary,
  XcElevationState,
  XcPipelineInput,
  XcReason,
  XcReasonCode,
  XcRecommendationResult,
  XcSegment,
  XcZoneDemand,
  XcZoneId,
} from './types';

const ZONES: XcZoneId[] = ['torso', 'legs', 'hands', 'feet', 'head'];

/**
 * Cross-country recommendation foundation.
 *
 * One engine covers classic and skate. The line, its ETA, and ground
 * elevation are supplied by the caller. This function does not call a
 * router, a grooming feed, or a wax model.
 */
export function runXcRecommendationPipeline(
  input: XcPipelineInput,
): XcRecommendationResult {
  const parsed = parseXcIntensity(input.intensity);
  const personalColdBiasC = finiteBias(input.personalColdBiasC);
  const style = parseXcStyle(input.style);
  const incompleteWeather = input.weather.points.length === 0;
  const segments = buildSegments(input, parsed.intensity, incompleteWeather);
  const demand = summarizeDemand(segments, input.zoneColdBiasC);
  const sustainedExposure = weightedMean(
    segments.map((segment) => ({
      value: segment.exposureC,
      weight: segment.durationMin,
    })),
  );
  const climbing = segments.some((segment) => segment.climbing);
  const matched = matchXcKit({
    demand,
    wardrobe: input.wardrobe,
    intensity: parsed.intensity,
    style,
    sustainedExposureC: incompleteWeather ? 0 : sustainedExposure,
    climbing,
  });
  const elevation = elevationState(segments, incompleteWeather);
  const xcGarments = input.wardrobe.filter(
    (garment) =>
      isXcGarment(garment) &&
      !['one_piece_suit', 'heated_vest', 'boots'].includes(garment.category),
  );
  const confidence = scoreConfidence({
    incompleteWeather,
    pointCount: input.weather.points.length,
    intensityAssumed: parsed.assumed,
    durationAssumed: input.durationAssumed,
    xcGarmentCount: xcGarments.length,
    elevation,
  });
  const reasons = dedupe([
    ...demandReasons(segments, demand, sustainedExposure, incompleteWeather),
    ...matched.reasons,
    ...contextReasons({
      incompleteWeather,
      intensityAssumed: parsed.assumed,
      durationAssumed: input.durationAssumed,
      style,
      elevation,
      climbing,
      xcGarmentCount: xcGarments.length,
      wardrobeCount: input.wardrobe.length,
    }),
    ...confidence.reasons.map((code) => ({ code })),
  ]);

  return {
    engine: 'xc_v1',
    intensity: parsed.intensity,
    intensityAssumed: parsed.assumed,
    style,
    durationAssumed: input.durationAssumed,
    line: 'user_waypoints',
    elevation,
    exposure: {
      xcExposureMinC: round1(
        Math.min(...segments.map((segment) => segment.exposureC)),
      ),
      xcExposureMaxC: round1(
        Math.max(...segments.map((segment) => segment.exposureC)),
      ),
      xcExposureSustainedC: round1(sustainedExposure),
      segments: segments.map((segment) => ({
        index: segment.index,
        durationMin: segment.durationMin,
        airTempC: segment.weather.airTempC,
        windSpeedMs: segment.weather.windSpeedMs,
        exposureC: round1(segment.exposureC),
        groundElevationM: segment.weather.groundElevationM ?? null,
        forecastAt: segment.weather.forecastAt ?? null,
        climbing: segment.climbing,
        isShortExtreme: segment.isShortExtreme,
      })),
    },
    demand,
    wear: matched.wear,
    pack: matched.pack,
    reasons,
    confidence: {
      level: confidence.level,
      reasons: confidence.reasons,
    },
    personalization: {
      voice: 'baseline',
      sampleCount: finiteCount(input.personalSampleCount),
      canClaimPersonal: false,
      personalColdBiasC,
    },
  };
}

export function parseXcIntensity(value?: string | null): {
  intensity: XcIntensity;
  assumed: boolean;
} {
  const normalized = (value ?? '').trim().toLowerCase();
  if ((XC_INTENSITIES as readonly string[]).includes(normalized)) {
    return { intensity: normalized as XcIntensity, assumed: false };
  }
  return { intensity: 'steady', assumed: true };
}

export function parseXcStyle(value?: string | null): XcStyle | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if ((XC_STYLES as readonly string[]).includes(normalized)) {
    return normalized as XcStyle;
  }
  return null;
}

function buildSegments(
  input: XcPipelineInput,
  intensity: XcIntensity,
  incompleteWeather: boolean,
): XcSegment[] {
  const points = incompleteWeather
    ? [
        {
          lat: 0,
          lon: 0,
          airTempC: 0,
          precipitationProbPct: 0,
          precipitationMm: 0,
          windSpeedMs: 2,
        },
      ]
    : input.weather.points;
  const supplied = input.sampleDurationMin ?? [];
  const useSupplied =
    supplied.length === points.length &&
    supplied.every((minutes) => Number.isFinite(minutes) && minutes >= 0);
  const rideMin = Math.max(1, Math.round(input.durationMin || points.length));
  const even = evenDurations(points.length, rideMin);
  const raw = points.map((point, index) => {
    const previous = index > 0 ? points[index - 1].groundElevationM : null;
    const climbing = xcSampleIsClimbing(point.groundElevationM, previous);
    const exposure = xcExposureC(point, {
      intensity,
      climbing,
      personalColdBiasC: finiteBias(input.personalColdBiasC),
    });
    return {
      index,
      durationMin: useSupplied ? supplied[index] : even[index],
      weather: point,
      climbing,
      exposureC: exposure,
      warmthDemand: xcWarmthDemand(exposure),
      windDemand: xcWindDemand(point.windSpeedMs),
      waterDemand: xcWaterDemand(point),
      isShortExtreme: false,
    };
  });
  const sustainedWarmth = weightedMean(
    raw.map((segment) => ({
      value: segment.warmthDemand,
      weight: Math.max(segment.durationMin, 0),
    })),
  );
  const total = raw.reduce((sum, segment) => sum + segment.durationMin, 0);
  return raw.map((segment) => ({
    ...segment,
    isShortExtreme: isShortExtreme(
      segment.durationMin,
      total,
      segment.warmthDemand,
      sustainedWarmth,
    ),
  }));
}

function summarizeDemand(
  segments: XcSegment[],
  zoneColdBias?: ZoneColdBiasC | null,
): XcDemandSummary {
  const sustainedWarmth = clampTier(
    weightedMean(
      segments.map((segment) => ({
        value: segment.warmthDemand,
        weight: segment.durationMin,
      })),
    ),
  );
  const sustainedWind = clampTier(
    weightedMean(
      segments.map((segment) => ({
        value: segment.windDemand,
        weight: segment.durationMin,
      })),
    ),
  );
  const sustainedWater = clampTier(
    weightedMean(
      segments.map((segment) => ({
        value: segment.waterDemand,
        weight: segment.durationMin,
      })),
    ),
  );
  const moving = segments.filter((segment) => !segment.isShortExtreme);
  const movingWarmth = moving.length
    ? clampTier(
        weightedMean(
          moving.map((segment) => ({
            value: segment.warmthDemand,
            weight: segment.durationMin,
          })),
        ),
      )
    : sustainedWarmth;
  const peakWarmth = clampTier(
    Math.max(movingWarmth, ...segments.map((segment) => segment.warmthDemand)),
  );
  const peakWind = clampTier(
    Math.max(sustainedWind, ...segments.map((segment) => segment.windDemand)),
  );
  const peakWater = clampTier(
    Math.max(sustainedWater, ...segments.map((segment) => segment.waterDemand)),
  );
  const shorts = segments.filter((segment) => segment.isShortExtreme);
  const shortExtremeWarmth = shorts.length
    ? clampTier(Math.max(...shorts.map((segment) => segment.warmthDemand)))
    : movingWarmth;
  const sustainedSamples = (moving.length > 0 ? moving : segments).map(
    (segment) => ({
      exposureC: segment.exposureC,
      weight: segment.durationMin,
    }),
  );
  const peakSamples = segments.map((segment) => ({
    exposureC: segment.exposureC,
    weight: segment.durationMin,
  }));
  return {
    sustained: withZoneColdBias(
      ZONES.map((zone) =>
        zoneDemand(zone, movingWarmth, sustainedWind, sustainedWater),
      ),
      movingWarmth,
      sustainedSamples,
      xcWarmthDemand,
      zoneColdBias,
    ),
    peak: withZoneColdBias(
      ZONES.map((zone) => zoneDemand(zone, peakWarmth, peakWind, peakWater)),
      peakWarmth,
      peakSamples,
      xcWarmthDemand,
      zoneColdBias,
      true,
    ),
    sustainedWarmth: movingWarmth,
    peakWarmth,
    sustainedWind,
    peakWind,
    sustainedWater,
    peakWater,
    shortExtremeWarmth,
    shortExtremeInfluencesPackOnly:
      shorts.length > 0 && peakWarmth > movingWarmth,
  };
}

function zoneDemand(
  zone: XcZoneId,
  warmth: number,
  wind: number,
  water: number,
): XcZoneDemand {
  const nextWind = zone === 'hands' && wind >= 3 ? clampTier(wind + 1) : wind;
  return { zone, warmth, wind: nextWind, water };
}

function demandReasons(
  segments: XcSegment[],
  demand: XcDemandSummary,
  sustainedExposure: number,
  incompleteWeather: boolean,
): XcReason[] {
  const reasons: XcReason[] = [];
  if (
    !incompleteWeather &&
    sustainedExposure >= 8 &&
    demand.sustainedWater <= 2 &&
    demand.sustainedWarmth <= 2
  ) {
    reasons.push({ code: 'MILD_CONDITIONS' });
  }
  if (demand.sustainedWarmth >= 4) {
    reasons.push({ code: 'SUSTAINED_COLD_EXPOSURE' });
  }
  if (demand.shortExtremeInfluencesPackOnly) {
    reasons.push({ code: 'SHORT_COLD_STOP_PACKED' });
  }
  if (demand.sustainedWind >= 4) reasons.push({ code: 'HIGH_WIND_EXPOSURE' });
  const temps = segments.map((segment) => segment.weather.airTempC);
  if (temps.length > 1 && Math.max(...temps) - Math.min(...temps) >= 6) {
    reasons.push({ code: 'TEMPERATURE_VARIATION' });
  }
  return reasons;
}

function contextReasons(input: {
  incompleteWeather: boolean;
  intensityAssumed: boolean;
  durationAssumed: boolean;
  style: XcStyle | null;
  elevation: XcElevationState;
  climbing: boolean;
  xcGarmentCount: number;
  wardrobeCount: number;
}): XcReason[] {
  const reasons: XcReason[] = [
    { code: 'USER_TRACK_NOT_ROAD' },
    { code: 'BASELINE_NO_PERSONAL_EVIDENCE' },
    { code: 'NO_GROOMING_STATUS' },
    { code: 'NO_WAX_ADVICE' },
  ];
  if (input.incompleteWeather) reasons.push({ code: 'INCOMPLETE_WEATHER' });
  if (input.intensityAssumed) reasons.push({ code: 'ASSUMED_INTENSITY' });
  if (input.durationAssumed) reasons.push({ code: 'ASSUMED_DURATION' });
  reasons.push({
    code:
      input.elevation === 'used'
        ? 'ELEVATION_USED'
        : input.elevation === 'partial'
          ? 'ELEVATION_PARTIAL'
          : 'ELEVATION_UNAVAILABLE',
  });
  if (input.climbing) reasons.push({ code: 'CLIMB_REDUCES_WORN_DEMAND' });
  if (input.xcGarmentCount === 0) reasons.push({ code: 'GENERIC_XC_KIT' });
  if (input.wardrobeCount === 0 || input.xcGarmentCount < 2) {
    reasons.push({ code: 'INCOMPLETE_WARDROBE' });
  }
  return reasons;
}

function scoreConfidence(input: {
  incompleteWeather: boolean;
  pointCount: number;
  intensityAssumed: boolean;
  durationAssumed: boolean;
  xcGarmentCount: number;
  elevation: XcElevationState;
}): { level: XcConfidenceLevel; reasons: XcReasonCode[] } {
  let score = 2;
  const reasons: XcReasonCode[] = [];
  if (input.incompleteWeather || input.pointCount === 0) {
    score -= 2;
    reasons.push('INCOMPLETE_WEATHER');
  } else if (input.pointCount >= 3) score += 2;
  else score += 1;
  if (input.intensityAssumed) score -= 1;
  if (input.durationAssumed) score -= 1;
  if (input.xcGarmentCount >= 2) score += 1;
  else score -= 1;
  if (input.elevation === 'unavailable') {
    score -= 1;
    reasons.push('ELEVATION_UNAVAILABLE');
  }
  let level: XcConfidenceLevel = 'MEDIUM';
  if (score <= 1) level = 'LOW';
  else if (score >= 5) level = 'HIGH';
  return { level, reasons };
}

function elevationState(
  segments: XcSegment[],
  incompleteWeather: boolean,
): XcElevationState {
  if (incompleteWeather) return 'unavailable';
  const known = segments.filter(
    (segment) => segment.weather.groundElevationM != null,
  ).length;
  if (known === 0) return 'unavailable';
  if (known === segments.length) return 'used';
  return 'partial';
}

function isShortExtreme(
  durationMin: number,
  totalMin: number,
  warmth: number,
  sustainedWarmth: number,
): boolean {
  if (warmth <= sustainedWarmth) return false;
  if (durationMin <= XC_EXPOSURE.shortExtremeMaxMin) return true;
  if (totalMin <= 0) return false;
  return durationMin / totalMin <= XC_EXPOSURE.shortExtremeMaxFraction;
}

function evenDurations(count: number, totalMin: number): number[] {
  if (count <= 0) return [];
  const share = Math.max(1, Math.round(totalMin / count));
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? Math.max(1, totalMin - share * (count - 1)) : share,
  );
}

function weightedMean(rows: Array<{ value: number; weight: number }>): number {
  const weight = rows.reduce((sum, row) => sum + Math.max(0, row.weight), 0);
  if (weight <= 0) return rows[0]?.value ?? 0;
  const total = rows.reduce(
    (sum, row) => sum + row.value * Math.max(0, row.weight),
    0,
  );
  return total / weight;
}

function clampTier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function finiteBias(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function finiteCount(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function dedupe(reasons: XcReason[]): XcReason[] {
  const seen = new Set<string>();
  const out: XcReason[] = [];
  for (const reason of reasons) {
    const key = `${reason.code}:${JSON.stringify(reason.params ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
}
