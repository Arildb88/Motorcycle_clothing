import type { WeatherPoint } from '../weather.types';

export const CYCLING_INTENSITIES = ['easy', 'steady', 'hard'] as const;
export type CyclingIntensity = (typeof CYCLING_INTENSITIES)[number];

export type CyclingSpeedSource = 'cycling_geometry' | 'assumed_style';

export const CYCLING_REASON_CODES = [
  'MILD_CONDITIONS',
  'SUSTAINED_COLD',
  'PACK_EXTRA_LAYER',
  'PACK_SHELL_FOR_LATER_RAIN',
  'WEAR_SHELL_FOR_RAIN',
  'WEAR_SHELL_FOR_COLD',
  'VENT_OR_PACK_SHELL',
  'HIGH_WIND',
  'HANDS_LIMITING',
  'FEET_LIMITING',
  'HELMET_ASSUMED_NOT_SELECTED',
  'GENERIC_KIT_NO_CYCLING_TAGS',
  'CYCLING_WARDROBE_MATCH',
  'CYCLING_INTENSITY',
  'CYCLING_INTENSITY_UNSPECIFIED',
  'CYCLING_GEOMETRY_USED',
  'CYCLING_WAYPOINT_FALLBACK',
  'GROUND_ELEVATION_USED',
  'GROUND_ELEVATION_UNAVAILABLE',
  'WIND_DIRECTION_UNAVAILABLE',
  'INCOMPLETE_WEATHER',
  'BASELINE_NO_CYCLING_OFFSETS',
] as const;
export type CyclingReasonCode = (typeof CYCLING_REASON_CODES)[number];

export type CyclingReason = {
  code: CyclingReasonCode;
  params?: Record<string, string | number | boolean>;
};

export type CyclingZoneId = 'torso' | 'legs' | 'hands' | 'feet' | 'head';

export type CyclingZoneDemand = {
  zone: CyclingZoneId;
  warmth: number;
  wind: number;
  water: number;
};

export type CyclingGarmentInput = {
  id: string;
  name: string;
  category: string;
  primaryBodyZone: string;
  warmthTier: number;
  activityTags: string[];
};

export type CyclingKitItem = {
  mode: 'wear' | 'pack';
  source: 'wardrobe' | 'generic';
  slot: string;
  zone: CyclingZoneId;
  garmentId?: string;
  garmentName?: string;
  genericLabel?: string;
  category?: string;
};

export type CyclingConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CyclingSampleMotion = {
  expectedSpeedKmh: number;
  durationMin: number;
  speedSource: CyclingSpeedSource;
};

export type CyclingSegment = {
  index: number;
  durationMin: number;
  weather: WeatherPoint;
  expectedSpeedKmh: number;
  speedSource: CyclingSpeedSource;
  apparentAirflowMs: number;
  airflowMode: 'vector' | 'scalar_sum';
  cyclingExposureC: number;
  warmthDemand: number;
  windDemand: number;
  waterDemand: number;
};

export type CyclingRecommendationResult = {
  engine: 'cycling_v1';
  intensity: CyclingIntensity | null;
  /** True when the caller did not pass easy, steady, or hard. */
  intensitySpecified: boolean;
  cyclingPersonalOffsetsApplied: false;
  exposure: {
    cyclingExposureMinC: number;
    cyclingExposureMaxC: number;
    cyclingExposureSustainedC: number;
    speedSource: CyclingSpeedSource;
    durationWeightedSpeedKmh: number;
    windDirectionUsed: boolean;
    groundElevationUsed: boolean;
    usedCyclingGeometry: boolean;
    segments: Array<{
      index: number;
      durationMin: number;
      airTempC: number;
      expectedSpeedKmh: number;
      apparentAirflowMs: number;
      cyclingExposureC: number;
      groundElevationM: number | null;
    }>;
  };
  demand: {
    sustained: CyclingZoneDemand[];
    peak: CyclingZoneDemand[];
    sustainedWarmth: number;
    peakWarmth: number;
    sustainedWater: number;
    peakWater: number;
  };
  wear: CyclingKitItem[];
  pack: CyclingKitItem[];
  reasons: CyclingReason[];
  confidence: {
    level: CyclingConfidenceLevel;
    reasons: CyclingReasonCode[];
  };
};
