import type { WeatherPoint } from '../weather.types';
import type { VentState } from '../../domain';
import type { ApparentAirflowMode } from './airflow';
import type { SpeedSource } from './route-travel';

export type { SpeedSource } from './route-travel';

/** Language-neutral reason codes for Flutter localization. */
export const REASON_CODES = [
  'MILD_CONDITIONS',
  'LOW_EFFECTIVE_TEMPERATURE',
  'SUSTAINED_COLD_EXPOSURE',
  'SHORT_COLD_SEGMENT',
  'RAIN_PROTECTION_REQUIRED',
  'PACK_RAIN_LAYER',
  'HIGH_WIND_EXPOSURE',
  'TEMPERATURE_VARIATION',
  'THERMAL_LINER_RECOMMENDED',
  'WATERPROOF_LINER_RECOMMENDED',
  'VENTS_CLOSED_RECOMMENDED',
  'VENTS_OPEN_RECOMMENDED',
  'PACK_EXTRA_INSULATION',
  'WARDROBE_GAP',
  'INCOMPLETE_WEATHER',
  'INCOMPLETE_WARDROBE',
  'BASELINE_NO_PERSONAL_EVIDENCE',
  'ROUTE_SPEED_PROFILE_USED',
  'ROUTE_SPEED_PROFILE_UNAVAILABLE',
  'ASSUMED_CRUISE_SPEED',
  'WIND_DIRECTION_UNAVAILABLE',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type Reason = {
  code: ReasonCode;
  params?: Record<string, string | number | boolean>;
};

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ZoneId =
  | 'torso'
  | 'legs'
  | 'hands'
  | 'feet'
  | 'head'
  | 'neck';

/** Ordinal demand 1–5 aligned with garment warmth/wind/water tiers. */
export type ZoneDemand = {
  zone: ZoneId;
  warmth: number;
  wind: number;
  water: number;
};

export type RideSegment = {
  index: number;
  durationMin: number;
  fraction: number;
  weather: WeatherPoint;
  expectedSpeedKmh: number;
  speedSource: SpeedSource;
  apparentAirflowMs: number;
  airflowMode: ApparentAirflowMode;
  motorcycleExposureC: number;
  warmthDemand: number;
  windDemand: number;
  waterDemand: number;
  isShortExtreme: boolean;
};

export type GarmentInput = {
  id: string;
  name: string;
  category: string;
  layer: string;
  primaryBodyZone: string;
  warmthTier: number;
  windResistTier: number;
  waterResistTier: number;
  breathabilityTier: number;
  material: string | null;
  hasVentilation: boolean;
  isHeated: boolean;
  activityTags: string[];
  components: Array<{
    id: string;
    kind: string;
    name: string | null;
    warmthDelta: number;
    windResistDelta: number;
    waterResistDelta: number;
    breathabilityDelta: number;
  }>;
};

export type ConfigInstruction = {
  code:
    | 'INSTALL_THERMAL_LINER'
    | 'REMOVE_THERMAL_LINER'
    | 'INSTALL_WATERPROOF_LINER'
    | 'REMOVE_WATERPROOF_LINER'
    | 'VENTS_CLOSED'
    | 'VENTS_OPEN';
  vents?: VentState;
  componentKind?: string;
};

export type KitItem = {
  mode: 'wear' | 'pack';
  source: 'wardrobe' | 'generic';
  slot: string;
  zone: ZoneId | 'full_body' | 'rain';
  garmentId?: string;
  garmentName?: string;
  genericLabel?: string;
  category?: string;
  configuration: ConfigInstruction[];
  effectiveTiers?: {
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
  };
};

export type DemandSummary = {
  sustained: ZoneDemand[];
  peak: ZoneDemand[];
  shortExtremeWarmth: number;
  sustainedWarmth: number;
  peakWarmth: number;
  shortExtremeInfluencesPackOnly: boolean;
};

export type ExposureSummary = {
  motorcycleExposureMinC: number;
  motorcycleExposureMaxC: number;
  motorcycleExposureSustainedC: number;
  /**
   * Duration-weighted effective speed used for exposure.
   * Retained name for older clients; equals durationWeightedSpeedKmh.
   */
  assumedCruiseKmh: number;
  speedSource: SpeedSource;
  durationWeightedSpeedKmh: number;
  speedMinKmh: number;
  speedMaxKmh: number;
  windDirectionUsed: boolean;
  segments: Array<{
    index: number;
    durationMin: number;
    airTempC: number;
    windSpeedMs: number;
    expectedSpeedKmh: number;
    apparentAirflowMs: number;
    motorcycleExposureC: number;
    isShortExtreme: boolean;
  }>;
};

export type MotorcycleRecommendationResult = {
  engine: 'motorcycle_v1';
  exposure: ExposureSummary;
  demand: DemandSummary;
  wear: KitItem[];
  pack: KitItem[];
  reasons: Reason[];
  confidence: {
    level: ConfidenceLevel;
    reasons: ReasonCode[];
  };
  personalization: {
    voice: 'baseline' | 'personal';
    sampleCount: number;
    shrinkageK: number;
    personalWeight: number;
    canClaimPersonal: boolean;
  };
};
