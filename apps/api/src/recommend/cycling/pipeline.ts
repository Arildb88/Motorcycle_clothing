import type { RouteLegTiming } from '../../routing/routing.types';
import type { RouteWeatherSummary, WeatherPoint } from '../weather.types';
import { cyclingApparentAirflow } from './airflow';
import { CYCLING_EXPOSURE, CYCLING_SHELL } from './constants';
import { cyclingSampleMotion } from './speed';
import {
  CYCLING_INTENSITIES,
  type CyclingConfidenceLevel,
  type CyclingGarmentInput,
  type CyclingIntensity,
  type CyclingKitItem,
  type CyclingReason,
  type CyclingReasonCode,
  type CyclingRecommendationResult,
  type CyclingSegment,
  type CyclingZoneDemand,
  type CyclingZoneId,
} from './types';

const ZONES: CyclingZoneId[] = ['torso', 'legs', 'hands', 'feet', 'head'];

const SLOT_CATEGORIES: Record<string, string[]> = {
  base: ['base_layer'],
  jersey: ['mid_layer'],
  shell: ['shell_jacket', 'rain_layer'],
  legs: ['pants'],
  hands: ['gloves'],
  feet: ['boots', 'socks'],
  head: ['headwear'],
};

export type CyclingPipelineInput = {
  weather: RouteWeatherSummary;
  wardrobe: CyclingGarmentInput[];
  /** Null when the caller did not pass easy, steady, or hard. */
  intensity: CyclingIntensity | null;
  /** Shared profile prior. -1 gets cold easily, +1 runs warm. Not a cycling offset. */
  coldSensitivity?: number;
  rideDurationMin: number;
  routeDistanceM?: number | null;
  usedCyclingGeometry: boolean;
  legs?: RouteLegTiming[] | null;
  /** Aligned with weather.points. Missing values are filled evenly. */
  sampleProgress?: number[];
  sampleHeadingDeg?: Array<number | null>;
};

export function parseCyclingIntensity(
  value: string | null | undefined,
): CyclingIntensity | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if ((CYCLING_INTENSITIES as readonly string[]).includes(normalized)) {
    return normalized as CyclingIntensity;
  }
  return null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampTier(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function durationWeightedMean(
  parts: Array<{ value: number; weight: number }>,
): number {
  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  if (total <= 0) return parts[0]?.value ?? 0;
  return parts.reduce((sum, part) => sum + part.value * part.weight, 0) / total;
}

function coldBiasC(sensitivity: number | undefined): number {
  if (sensitivity == null || !Number.isFinite(sensitivity)) return 0;
  const clamped = Math.min(1, Math.max(-1, sensitivity));
  return -clamped;
}

export function waterDemandFromPoint(point: WeatherPoint): number {
  const prob = point.precipitationProbPct;
  const mm = point.precipitationMm;
  if (prob >= 70 || mm >= 1) return 5;
  if (prob >= 50 || mm >= 0.5) return 4;
  if (prob >= 30 || mm >= 0.2) return 3;
  if (prob >= 15 || mm > 0) return 2;
  return 1;
}

export function windDemandFromAirflow(airflowMs: number): number {
  if (airflowMs >= 12) return 5;
  if (airflowMs >= 8) return 4;
  if (airflowMs >= 5) return 3;
  if (airflowMs >= 3) return 2;
  return 1;
}

export function warmthDemandFromCyclingExposure(exposureC: number): number {
  if (exposureC < CYCLING_EXPOSURE.extremeBelowC) return 5;
  if (exposureC < CYCLING_EXPOSURE.veryColdBelowC) return 4;
  if (exposureC < CYCLING_EXPOSURE.coldBelowC) return 3;
  if (exposureC < CYCLING_EXPOSURE.coolBelowC) return 2;
  return 1;
}

function metabolicOffsetC(intensity: CyclingIntensity | null): number {
  if (intensity == null) return CYCLING_EXPOSURE.metabolicOffsetC.steady;
  return CYCLING_EXPOSURE.metabolicOffsetC[intensity];
}

export function cyclingExposureC(input: {
  point: WeatherPoint;
  expectedSpeedKmh: number;
  headingDeg?: number | null;
  intensity: CyclingIntensity | null;
  coldSensitivity?: number;
}): { exposureC: number; airflowMs: number; mode: 'vector' | 'scalar_sum' } {
  const airflow = cyclingApparentAirflow({
    expectedSpeedKmh: input.expectedSpeedKmh,
    windSpeedMs: input.point.windSpeedMs,
    windFromDeg: input.point.windFromDeg,
    headingDeg: input.headingDeg,
  });
  const above = Math.max(0, airflow.apparentAirflowMs - CYCLING_EXPOSURE.windThresholdMs);
  const chill = above * CYCLING_EXPOSURE.windChillPerMs;
  const wet = waterDemandFromPoint(input.point) >= 3 ? CYCLING_EXPOSURE.wetPenaltyC : 0;
  const exposureC =
    input.point.airTempC -
    chill -
    wet +
    metabolicOffsetC(input.intensity) -
    coldBiasC(input.coldSensitivity);
  return {
    exposureC,
    airflowMs: airflow.apparentAirflowMs,
    mode: airflow.mode,
  };
}

function zoneWarmth(zone: CyclingZoneId, base: number): number {
  if ((zone === 'hands' || zone === 'feet') && base >= 2) return clampTier(base + 1);
  if (zone === 'head' && base >= 3) return clampTier(base + 1);
  return clampTier(base);
}

function zoneRow(
  zone: CyclingZoneId,
  warmth: number,
  wind: number,
  water: number,
): CyclingZoneDemand {
  return {
    zone,
    warmth: zoneWarmth(zone, warmth),
    wind: clampTier(wind),
    water: clampTier(water),
  };
}

function matchGarment(
  wardrobe: CyclingGarmentInput[],
  slot: string,
  zone: CyclingZoneId,
): CyclingGarmentInput | null {
  const categories = SLOT_CATEGORIES[slot] ?? [];
  const tagged = wardrobe.filter(
    (garment) =>
      garment.activityTags.includes('cycling') &&
      categories.includes(garment.category),
  );
  const zonal = tagged.filter(
    (garment) =>
      garment.primaryBodyZone === zone || garment.primaryBodyZone === 'full_body',
  );
  const pool = zonal.length > 0 ? zonal : tagged;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => a.name.localeCompare(b.name))[0];
}

function kitItem(
  mode: 'wear' | 'pack',
  slot: string,
  zone: CyclingZoneId,
  genericLabel: string,
  garment: CyclingGarmentInput | null,
): CyclingKitItem {
  if (!garment) {
    return { mode, source: 'generic', slot, zone, genericLabel };
  }
  return {
    mode,
    source: 'wardrobe',
    slot,
    zone,
    garmentId: garment.id,
    garmentName: garment.name,
    category: garment.category,
  };
}

function legsLabel(warmth: number): string {
  return warmth >= CYCLING_SHELL.wearWarmth ? 'Cycling tights' : 'Cycling shorts';
}

function handsLabel(warmth: number): string {
  return warmth >= 4 ? 'Winter cycling gloves' : 'Light cycling gloves';
}

function feetLabel(warmth: number): string {
  return warmth >= 4 ? 'Warmer cycling footwear' : 'Cycling shoe covers';
}

/**
 * Cycling recommendation foundation.
 * Does not apply motorcycle exposure, armour presets, or personal offsets.
 */
export function runCyclingRecommendationPipeline(
  input: CyclingPipelineInput,
): CyclingRecommendationResult {
  const points = input.weather.points;
  const intensity = input.intensity;
  if (points.length === 0) {
    return incompleteWeatherResult(input);
  }
  const motion = cyclingSampleMotion({
    sampleCount: Math.max(points.length, 1),
    progresses: input.sampleProgress ?? [],
    durationMin: input.rideDurationMin,
    distanceM: input.routeDistanceM ?? null,
    usedCyclingGeometry: input.usedCyclingGeometry,
    legs: input.legs,
    intensity,
  });

  const segments: CyclingSegment[] = points.map(
    (point, index) => {
      const sample = motion[index] ?? motion[0];
      const heading = input.sampleHeadingDeg?.[index] ?? null;
      const exposure = cyclingExposureC({
        point,
        expectedSpeedKmh: sample?.expectedSpeedKmh ?? assumedFallback(intensity),
        headingDeg: heading,
        intensity,
        coldSensitivity: input.coldSensitivity,
      });
      const warmth = warmthDemandFromCyclingExposure(exposure.exposureC);
      return {
        index,
        durationMin: sample?.durationMin ?? 1,
        weather: point,
        expectedSpeedKmh: sample?.expectedSpeedKmh ?? assumedFallback(intensity),
        speedSource: sample?.speedSource ?? 'assumed_style',
        apparentAirflowMs: round1(exposure.airflowMs),
        airflowMode: exposure.mode,
        cyclingExposureC: round1(exposure.exposureC),
        warmthDemand: warmth,
        windDemand: windDemandFromAirflow(exposure.airflowMs),
        waterDemand: points.length > 0 ? waterDemandFromPoint(point) : 1,
      };
    },
  );

  const sustainedWarmth = clampTier(
    durationWeightedMean(
      segments.map((segment) => ({
        value: segment.warmthDemand,
        weight: segment.durationMin,
      })),
    ),
  );
  const sustainedWind = clampTier(
    durationWeightedMean(
      segments.map((segment) => ({
        value: segment.windDemand,
        weight: segment.durationMin,
      })),
    ),
  );
  const sustainedWater = clampTier(
    durationWeightedMean(
      segments.map((segment) => ({
        value: segment.waterDemand,
        weight: segment.durationMin,
      })),
    ),
  );
  const peakWarmth = clampTier(
    Math.max(sustainedWarmth, ...segments.map((segment) => segment.warmthDemand)),
  );
  const peakWind = clampTier(
    Math.max(sustainedWind, ...segments.map((segment) => segment.windDemand)),
  );
  const peakWater = clampTier(
    Math.max(sustainedWater, ...segments.map((segment) => segment.waterDemand)),
  );

  const sustained = ZONES.map((zone) =>
    zoneRow(zone, sustainedWarmth, sustainedWind, sustainedWater),
  );
  const peak = ZONES.map((zone) => zoneRow(zone, peakWarmth, peakWind, peakWater));
  const torso = sustained.find((zone) => zone.zone === 'torso')!;
  const hands = sustained.find((zone) => zone.zone === 'hands')!;
  const feet = sustained.find((zone) => zone.zone === 'feet')!;
  const head = sustained.find((zone) => zone.zone === 'head')!;

  const wearShellForRain = sustainedWater >= CYCLING_SHELL.wearWater;
  const packShellForRain = !wearShellForRain && peakWater >= CYCLING_SHELL.packWater;
  const hardAndDry = intensity === 'hard' && peakWater <= 1 && torso.warmth <= 2;
  const wearShellForCold = !wearShellForRain && torso.warmth >= CYCLING_SHELL.wearWarmth;
  const packShellForHeat = hardAndDry && !wearShellForCold && !wearShellForRain;

  const wear: CyclingKitItem[] = [];
  const pack: CyclingKitItem[] = [];
  const pushWear = (slot: string, zone: CyclingZoneId, label: string) => {
    wear.push(kitItem('wear', slot, zone, label, matchGarment(input.wardrobe, slot, zone)));
  };
  const pushPack = (slot: string, zone: CyclingZoneId, label: string) => {
    pack.push(kitItem('pack', slot, zone, label, matchGarment(input.wardrobe, slot, zone)));
  };

  pushWear('base', 'torso', 'Light cycling base layer');
  pushWear('jersey', 'torso', 'Cycling jersey or vest');
  if (wearShellForRain || wearShellForCold) {
    pushWear('shell', 'torso', 'Cycling shell');
  }
  pushWear('legs', 'legs', legsLabel(torso.warmth));
  if (hands.warmth >= 2 || hands.wind >= 3) {
    pushWear('hands', 'hands', handsLabel(hands.warmth));
  }
  if (feet.warmth >= 2 || feet.water >= 3) {
    pushWear('feet', 'feet', feetLabel(feet.warmth));
  }
  if (head.warmth >= 3) {
    pushWear('head', 'head', 'Thin cycling cap or helmet liner');
  }
  if (packShellForRain || packShellForHeat) {
    pushPack(
      'shell',
      'torso',
      packShellForHeat ? 'Packable cycling shell' : 'Cycling shell for later rain',
    );
  }
  if (peakWarmth > sustainedWarmth) {
    pushPack('jersey', 'torso', 'Extra cycling layer for the colder section');
  }

  const reasons: CyclingReason[] = [];
  const add = (code: CyclingReasonCode, params?: CyclingReason['params']) => {
    if (reasons.some((reason) => reason.code === code)) return;
    reasons.push(params ? { code, params } : { code });
  };

  if (torso.warmth <= 1 && sustainedWater <= 1) add('MILD_CONDITIONS');
  if (torso.warmth >= 4) add('SUSTAINED_COLD');
  if (wearShellForRain) add('WEAR_SHELL_FOR_RAIN');
  if (wearShellForCold) add('WEAR_SHELL_FOR_COLD');
  if (packShellForRain) add('PACK_SHELL_FOR_LATER_RAIN');
  if (packShellForHeat) add('VENT_OR_PACK_SHELL');
  if (peakWarmth > sustainedWarmth) add('PACK_EXTRA_LAYER');
  if (sustainedWind >= 4) add('HIGH_WIND');
  if (hands.warmth > torso.warmth) add('HANDS_LIMITING');
  if (feet.warmth > torso.warmth) add('FEET_LIMITING');
  add('HELMET_ASSUMED_NOT_SELECTED');

  const matched = [...wear, ...pack].filter((item) => item.source === 'wardrobe').length;
  if (matched > 0) add('CYCLING_WARDROBE_MATCH');
  if (matched === 0) add('GENERIC_KIT_NO_CYCLING_TAGS');

  if (intensity) add('CYCLING_INTENSITY', { level: intensity });
  else add('CYCLING_INTENSITY_UNSPECIFIED');

  if (input.usedCyclingGeometry) add('CYCLING_GEOMETRY_USED');
  else add('CYCLING_WAYPOINT_FALLBACK');

  const groundElevationUsed = points.some(
    (point) => point.groundElevationM != null && Number.isFinite(point.groundElevationM),
  );
  if (groundElevationUsed) add('GROUND_ELEVATION_USED');
  else add('GROUND_ELEVATION_UNAVAILABLE');

  const windDirectionUsed = segments.some((segment) => segment.airflowMode === 'vector');
  if (!windDirectionUsed) add('WIND_DIRECTION_UNAVAILABLE');
  add('BASELINE_NO_CYCLING_OFFSETS');

  const confidence = scoreConfidence({
    pointCount: points.length,
    usedCyclingGeometry: input.usedCyclingGeometry,
    intensitySpecified: intensity != null,
    groundElevationUsed,
    wardrobeMatches: matched,
    reasons,
  });

  const exposures = segments.map((segment) => segment.cyclingExposureC);
  const sustainedExposure = round1(
    durationWeightedMean(
      segments.map((segment) => ({
        value: segment.cyclingExposureC,
        weight: segment.durationMin,
      })),
    ),
  );
  const speeds = segments.map((segment) => ({
    value: segment.expectedSpeedKmh,
    weight: segment.durationMin,
  }));

  return {
    engine: 'cycling_v1',
    intensity,
    intensitySpecified: intensity != null,
    cyclingPersonalOffsetsApplied: false,
    exposure: {
      cyclingExposureMinC: Math.min(...exposures),
      cyclingExposureMaxC: Math.max(...exposures),
      cyclingExposureSustainedC: sustainedExposure,
      speedSource: segments[0]?.speedSource ?? 'assumed_style',
      durationWeightedSpeedKmh: round1(durationWeightedMean(speeds)),
      windDirectionUsed,
      groundElevationUsed,
      usedCyclingGeometry: input.usedCyclingGeometry,
      segments: segments.map((segment) => ({
        index: segment.index,
        durationMin: segment.durationMin,
        airTempC: segment.weather.airTempC,
        expectedSpeedKmh: segment.expectedSpeedKmh,
        apparentAirflowMs: segment.apparentAirflowMs,
        cyclingExposureC: segment.cyclingExposureC,
        groundElevationM: segment.weather.groundElevationM ?? null,
      })),
    },
    demand: {
      sustained,
      peak,
      sustainedWarmth,
      peakWarmth,
      sustainedWater,
      peakWater,
    },
    wear,
    pack,
    reasons,
    confidence,
  };
}

function incompleteWeatherResult(
  input: CyclingPipelineInput,
): CyclingRecommendationResult {
  const intensity = input.intensity;
  const reasons: CyclingReason[] = [
    { code: 'INCOMPLETE_WEATHER' },
    { code: 'GENERIC_KIT_NO_CYCLING_TAGS' },
    { code: 'HELMET_ASSUMED_NOT_SELECTED' },
    intensity
      ? { code: 'CYCLING_INTENSITY', params: { level: intensity } }
      : { code: 'CYCLING_INTENSITY_UNSPECIFIED' },
    input.usedCyclingGeometry
      ? { code: 'CYCLING_GEOMETRY_USED' }
      : { code: 'CYCLING_WAYPOINT_FALLBACK' },
    { code: 'GROUND_ELEVATION_UNAVAILABLE' },
    { code: 'BASELINE_NO_CYCLING_OFFSETS' },
  ];
  return {
    engine: 'cycling_v1',
    intensity,
    intensitySpecified: intensity != null,
    cyclingPersonalOffsetsApplied: false,
    exposure: {
      cyclingExposureMinC: 0,
      cyclingExposureMaxC: 0,
      cyclingExposureSustainedC: 0,
      speedSource: 'assumed_style',
      durationWeightedSpeedKmh: 0,
      windDirectionUsed: false,
      groundElevationUsed: false,
      usedCyclingGeometry: input.usedCyclingGeometry,
      segments: [],
    },
    demand: {
      sustained: [],
      peak: [],
      sustainedWarmth: 1,
      peakWarmth: 1,
      sustainedWater: 1,
      peakWater: 1,
    },
    wear: [
      kitItem('wear', 'base', 'torso', 'Light cycling base layer', null),
      kitItem('wear', 'jersey', 'torso', 'Cycling jersey or vest', null),
      kitItem('wear', 'legs', 'legs', 'Cycling shorts', null),
    ],
    pack: [],
    reasons,
    confidence: { level: 'LOW', reasons: reasons.map((reason) => reason.code) },
  };
}

function assumedFallback(intensity: CyclingIntensity | null): number {
  if (intensity == null) return CYCLING_EXPOSURE.assumedSpeedKmh.steady;
  return CYCLING_EXPOSURE.assumedSpeedKmh[intensity];
}

function scoreConfidence(input: {
  pointCount: number;
  usedCyclingGeometry: boolean;
  intensitySpecified: boolean;
  groundElevationUsed: boolean;
  wardrobeMatches: number;
  reasons: CyclingReason[];
}): CyclingRecommendationResult['confidence'] {
  let score = 0;
  if (input.pointCount >= 3) score += 2;
  else if (input.pointCount >= 1) score += 1;
  else score -= 2;

  score += input.usedCyclingGeometry ? 2 : -1;
  score += input.intensitySpecified ? 1 : -1;
  score += input.groundElevationUsed ? 1 : -1;
  score += input.wardrobeMatches >= 2 ? 1 : -1;

  let level: CyclingConfidenceLevel = 'MEDIUM';
  if (score <= 1) level = 'LOW';
  else if (score >= 5) level = 'HIGH';

  const capped =
    !input.intensitySpecified ||
    !input.usedCyclingGeometry ||
    !input.groundElevationUsed ||
    input.pointCount === 0;
  if (capped && level === 'HIGH') level = 'MEDIUM';

  const codes = input.reasons.map((reason) => reason.code);
  return { level, reasons: [...new Set(codes)] };
}
