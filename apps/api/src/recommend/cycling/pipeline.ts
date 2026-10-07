import { maxFiniteWeatherNumber } from '../weather.types';
import {
  CYCLING_EXPOSURE,
  CYCLING_INTENSITIES,
  CYCLING_STYLE_SPEED_KMH,
  type CyclingIntensity,
} from './constants';
import {
  cyclingApparentAirflow,
  cyclingExposureC,
  cyclingWarmthDemand,
  cyclingWaterDemand,
  cyclingWindDemand,
} from './exposure';
import { isCyclingKitGarment, matchCyclingKit } from './kit';
import type {
  CyclingConfidenceLevel,
  CyclingDemandSummary,
  CyclingPipelineInput,
  CyclingReason,
  CyclingReasonCode,
  CyclingRecommendationResult,
  CyclingSegment,
  CyclingSpeedSource,
  CyclingZoneDemand,
  CyclingZoneId,
} from './types';

const ZONES: CyclingZoneId[] = ['torso', 'legs', 'hands', 'feet', 'head'];

/**
 * Cycling recommendation foundation.
 *
 * Route samples and ETA stay outside this module. This function turns those
 * samples plus an explicit ride style into wear/pack, reasons, and confidence.
 * It does not apply motorcycle exposure, armour presets, or personal offsets.
 */
export function runCyclingRecommendationPipeline(
  input: CyclingPipelineInput,
): CyclingRecommendationResult {
  const parsed = parseIntensity(input.intensity);
  const personalColdBiasC = finiteBias(input.personalColdBiasC);
  const incompleteWeather = input.weather.points.length === 0;
  const segments = buildSegments(input, parsed.intensity, incompleteWeather);
  const demand = summarizeDemand(segments);
  const sustainedExposure = weightedMean(
    segments.map((segment) => ({
      value: segment.cyclingExposureC,
      weight: segment.durationMin,
    })),
  );
  const maxRain = maxFiniteWeatherNumber(
    segments.map((segment) => segment.weather.precipitationProbPct),
  );
  const matched = matchCyclingKit({
    demand,
    wardrobe: input.wardrobe,
    intensity: parsed.intensity,
    maxRainProbPct: incompleteWeather ? 0 : maxRain,
    sustainedExposureC: sustainedExposure,
  });

  const windDirectionUsed = segments.some(
    (segment) => segment.airflowMode === 'vector',
  );
  const elevationUsed =
    Boolean(input.weather.elevation?.attribution) ||
    segments.some((segment) => segment.weather.groundElevationM != null);
  const cyclingGarments = input.wardrobe.filter((garment) =>
    isCyclingKitGarment(garment),
  );
  const speedSource = segments[0]?.speedSource ?? 'style_default';
  const confidence = scoreConfidence({
    incompleteWeather,
    pointCount: input.weather.points.length,
    speedSource,
    intensityAssumed: parsed.assumed,
    geometryFallback: input.geometryFallback,
    cyclingGarmentCount: cyclingGarments.length,
    elevationUsed,
  });

  const reasons = dedupe([
    ...demandReasons(segments, demand, sustainedExposure, incompleteWeather),
    ...matched.reasons,
    ...contextReasons({
      incompleteWeather,
      parsed,
      geometryFallback: input.geometryFallback,
      speedSource,
      windDirectionUsed,
      elevationUsed,
      cyclingGarmentCount: cyclingGarments.length,
      wardrobeCount: input.wardrobe.length,
    }),
    ...confidence.reasons.map((code) => ({ code })),
  ]);

  const durationWeighted = round1(
    weightedMean(
      segments.map((segment) => ({
        value: segment.expectedSpeedKmh,
        weight: segment.durationMin,
      })),
    ),
  );

  return {
    engine: 'cycling_v1',
    intensity: parsed.intensity,
    intensityAssumed: parsed.assumed,
    geometry: input.geometryFallback ? 'waypoint_fallback' : 'cycling_profile',
    elevation: elevationUsed ? 'used' : 'unavailable',
    exposure: {
      cyclingExposureMinC: round1(
        Math.min(...segments.map((segment) => segment.cyclingExposureC)),
      ),
      cyclingExposureMaxC: round1(
        Math.max(...segments.map((segment) => segment.cyclingExposureC)),
      ),
      cyclingExposureSustainedC: round1(sustainedExposure),
      speedSource,
      durationWeightedSpeedKmh: durationWeighted,
      windDirectionUsed,
      segments: segments.map((segment) => ({
        index: segment.index,
        durationMin: segment.durationMin,
        airTempC: segment.weather.airTempC,
        windSpeedMs: segment.weather.windSpeedMs,
        expectedSpeedKmh: segment.expectedSpeedKmh,
        apparentAirflowMs: segment.apparentAirflowMs,
        airflowMode: segment.airflowMode,
        cyclingExposureC: round1(segment.cyclingExposureC),
        groundElevationM: segment.weather.groundElevationM ?? null,
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

export function parseIntensity(value?: string | null): {
  intensity: CyclingIntensity;
  assumed: boolean;
} {
  const normalized = (value ?? '').trim().toLowerCase();
  if ((CYCLING_INTENSITIES as readonly string[]).includes(normalized)) {
    return { intensity: normalized as CyclingIntensity, assumed: false };
  }
  return { intensity: 'steady', assumed: true };
}

function buildSegments(
  input: CyclingPipelineInput,
  intensity: CyclingIntensity,
  incompleteWeather: boolean,
): CyclingSegment[] {
  const points = incompleteWeather
    ? [
        {
          lat: 0,
          lon: 0,
          airTempC: 10,
          precipitationProbPct: 0,
          precipitationMm: 0,
          windSpeedMs: 2,
        },
      ]
    : input.weather.points;
  const profile = (input.routeTravelSegments ?? []).filter(
    (segment) =>
      segment.durationMin > 0 &&
      Number.isFinite(segment.expectedSpeedKmh) &&
      segment.expectedSpeedKmh > 0,
  );
  const useProfile = profile.length > 0 && !input.geometryFallback;
  const aligned = useProfile && profile.length === points.length;
  const speedSource: CyclingSpeedSource = useProfile
    ? 'route_profile'
    : 'style_default';
  const fallbackSpeed = CYCLING_STYLE_SPEED_KMH[intensity];
  const overviewSpeed = useProfile
    ? round1(
        weightedMean(
          profile.map((segment) => ({
            value: segment.expectedSpeedKmh,
            weight: segment.durationMin,
          })),
        ),
      )
    : fallbackSpeed;
  const rideMin = Math.max(
    1,
    Math.round(input.rideDurationMin || points.length),
  );
  const raw = points.map((point, index) => {
    const travel = aligned ? profile[index] : undefined;
    const expectedSpeedKmh = travel?.expectedSpeedKmh ?? overviewSpeed;
    const airflow = cyclingApparentAirflow({
      speedKmh: expectedSpeedKmh,
      windSpeedMs: point.windSpeedMs,
      windFromDeg: point.windFromDeg,
      headingDeg: aligned ? travel?.headingDeg : null,
    });
    const exposure = cyclingExposureC(point, {
      apparentAirflowMs: airflow.apparentAirflowMs,
      intensity,
      personalColdBiasC: finiteBias(input.personalColdBiasC),
    });
    return {
      index,
      durationMin: travel?.durationMin ?? 1,
      weather: point,
      expectedSpeedKmh,
      speedSource,
      apparentAirflowMs: airflow.apparentAirflowMs,
      airflowMode: airflow.mode,
      cyclingExposureC: exposure,
      warmthDemand: cyclingWarmthDemand(exposure),
      windDemand: cyclingWindDemand(airflow.apparentAirflowMs),
      waterDemand: cyclingWaterDemand(point),
      isShortExtreme: false,
    };
  });
  if (!aligned) {
    const share = Math.max(1, Math.round(rideMin / raw.length));
    raw.forEach((segment, index) => {
      segment.durationMin =
        index === raw.length - 1
          ? Math.max(1, rideMin - share * (raw.length - 1))
          : share;
    });
  }
  const sustainedWarmth = weightedMean(
    raw.map((segment) => ({
      value: segment.warmthDemand,
      weight: segment.durationMin,
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

function summarizeDemand(segments: CyclingSegment[]): CyclingDemandSummary {
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
  const peakWarmth = clampTier(
    Math.max(
      sustainedWarmth,
      ...segments.map((segment) => segment.warmthDemand),
    ),
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
    : sustainedWarmth;
  return {
    sustained: ZONES.map((zone) =>
      zoneDemand(zone, sustainedWarmth, sustainedWind, sustainedWater),
    ),
    peak: ZONES.map((zone) =>
      zoneDemand(zone, peakWarmth, peakWind, peakWater),
    ),
    sustainedWarmth,
    peakWarmth,
    sustainedWind,
    peakWind,
    sustainedWater,
    peakWater,
    shortExtremeWarmth,
    shortExtremeInfluencesPackOnly:
      shorts.length > 0 && peakWarmth > sustainedWarmth,
  };
}

function zoneDemand(
  zone: CyclingZoneId,
  warmth: number,
  wind: number,
  water: number,
): CyclingZoneDemand {
  let nextWarmth = warmth;
  let nextWind = wind;
  let nextWater = water;
  if ((zone === 'hands' || zone === 'feet') && warmth >= 2) {
    nextWarmth = clampTier(warmth + 1);
  }
  if ((zone === 'hands' || zone === 'feet') && wind >= 2) {
    nextWind = clampTier(wind + 1);
  }
  if (zone === 'feet' && water >= 2) nextWater = clampTier(water + 1);
  if (zone === 'head' && warmth >= 3) nextWarmth = clampTier(warmth + 1);
  return { zone, warmth: nextWarmth, wind: nextWind, water: nextWater };
}

function demandReasons(
  segments: CyclingSegment[],
  demand: CyclingDemandSummary,
  sustainedExposure: number,
  incompleteWeather: boolean,
): CyclingReason[] {
  const reasons: CyclingReason[] = [];
  if (
    !incompleteWeather &&
    sustainedExposure >= 18 &&
    demand.sustainedWater <= 1
  ) {
    reasons.push({ code: 'MILD_CONDITIONS' });
  }
  if (demand.sustainedWarmth >= 4)
    reasons.push({ code: 'SUSTAINED_COLD_EXPOSURE' });
  if (demand.shortExtremeInfluencesPackOnly)
    reasons.push({ code: 'SHORT_COLD_SEGMENT' });
  if (demand.sustainedWind >= 4) reasons.push({ code: 'HIGH_WIND_EXPOSURE' });
  const temps = segments.map((segment) => segment.weather.airTempC);
  if (Math.max(...temps) - Math.min(...temps) >= 6) {
    reasons.push({ code: 'TEMPERATURE_VARIATION' });
  }
  const torso = demand.sustained.find((zone) => zone.zone === 'torso');
  const feet = demand.sustained.find((zone) => zone.zone === 'feet');
  const hands = demand.sustained.find((zone) => zone.zone === 'hands');
  if (torso && feet && feet.warmth > torso.warmth)
    reasons.push({ code: 'FEET_LIMITING_ZONE' });
  if (torso && hands && hands.wind > torso.wind)
    reasons.push({ code: 'HANDS_WIND_CHILL' });
  return reasons;
}

function contextReasons(input: {
  incompleteWeather: boolean;
  parsed: { assumed: boolean };
  geometryFallback: boolean;
  speedSource: CyclingSpeedSource;
  windDirectionUsed: boolean;
  elevationUsed: boolean;
  cyclingGarmentCount: number;
  wardrobeCount: number;
}): CyclingReason[] {
  const reasons: CyclingReason[] = [
    { code: 'HELMET_ASSUMED' },
    { code: 'BASELINE_NO_PERSONAL_EVIDENCE' },
  ];
  if (input.incompleteWeather) reasons.push({ code: 'INCOMPLETE_WEATHER' });
  if (input.parsed.assumed) reasons.push({ code: 'ASSUMED_RIDE_STYLE' });
  if (input.geometryFallback) reasons.push({ code: 'ROUTE_GEOMETRY_FALLBACK' });
  reasons.push({
    code:
      input.speedSource === 'route_profile'
        ? 'ROUTE_SPEED_PROFILE_USED'
        : 'ROUTE_SPEED_PROFILE_UNAVAILABLE',
  });
  if (!input.windDirectionUsed)
    reasons.push({ code: 'WIND_DIRECTION_UNAVAILABLE' });
  reasons.push({
    code: input.elevationUsed ? 'ELEVATION_USED' : 'ELEVATION_UNAVAILABLE',
  });
  if (input.cyclingGarmentCount === 0)
    reasons.push({ code: 'GENERIC_CYCLING_KIT' });
  if (input.wardrobeCount === 0 || input.cyclingGarmentCount < 2) {
    reasons.push({ code: 'INCOMPLETE_WARDROBE' });
  }
  return reasons;
}

function scoreConfidence(input: {
  incompleteWeather: boolean;
  pointCount: number;
  speedSource: CyclingSpeedSource;
  intensityAssumed: boolean;
  geometryFallback: boolean;
  cyclingGarmentCount: number;
  elevationUsed: boolean;
}): { level: CyclingConfidenceLevel; reasons: CyclingReasonCode[] } {
  let score = 2;
  const reasons: CyclingReasonCode[] = [];
  if (input.incompleteWeather || input.pointCount === 0) {
    score -= 2;
    reasons.push('INCOMPLETE_WEATHER');
  } else if (input.pointCount >= 3) score += 2;
  else score += 1;
  if (input.speedSource === 'route_profile') score += 2;
  else score -= 1;
  if (input.intensityAssumed) score -= 1;
  if (input.geometryFallback) score -= 1;
  if (input.cyclingGarmentCount >= 2) score += 1;
  else score -= 1;
  if (!input.elevationUsed) reasons.push('ELEVATION_UNAVAILABLE');
  let level: CyclingConfidenceLevel = 'MEDIUM';
  if (score <= 1) level = 'LOW';
  else if (score >= 5) level = 'HIGH';
  return { level, reasons };
}

function isShortExtreme(
  durationMin: number,
  totalMin: number,
  warmth: number,
  sustainedWarmth: number,
): boolean {
  if (warmth <= sustainedWarmth) return false;
  if (durationMin <= CYCLING_EXPOSURE.shortExtremeMaxMin) return true;
  if (totalMin <= 0) return false;
  return durationMin / totalMin <= CYCLING_EXPOSURE.shortExtremeMaxFraction;
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

function dedupe(reasons: CyclingReason[]): CyclingReason[] {
  const seen = new Set<string>();
  const out: CyclingReason[] = [];
  for (const reason of reasons) {
    const key = `${reason.code}:${JSON.stringify(reason.params ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
}
