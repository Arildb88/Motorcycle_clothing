import type { VentState } from '../../domain';
import type { CyclingIntensity } from './constants';
import type { WeatherPoint, RouteWeatherSummary } from '../weather.types';

export type { CyclingIntensity };

export type CyclingAirflowMode = 'vector' | 'scalar_sum';

export type CyclingSpeedSource = 'route_profile' | 'style_default';

export const CYCLING_REASON_CODES = [
  'MILD_CONDITIONS',
  'SUSTAINED_COLD_EXPOSURE',
  'SHORT_COLD_SEGMENT',
  'RAIN_PROTECTION_REQUIRED',
  'PACK_RAIN_LAYER',
  'VENT_OR_PACK_SHELL',
  'HIGH_WIND_EXPOSURE',
  'TEMPERATURE_VARIATION',
  'WARDROBE_GAP',
  'INCOMPLETE_WEATHER',
  'INCOMPLETE_WARDROBE',
  'GENERIC_CYCLING_KIT',
  'ASSUMED_RIDE_STYLE',
  'ROUTE_GEOMETRY_FALLBACK',
  'ROUTE_SPEED_PROFILE_USED',
  'ROUTE_SPEED_PROFILE_UNAVAILABLE',
  'WIND_DIRECTION_UNAVAILABLE',
  'ELEVATION_USED',
  'ELEVATION_UNAVAILABLE',
  'HELMET_ASSUMED',
  'BASELINE_NO_PERSONAL_EVIDENCE',
  'FEET_LIMITING_ZONE',
  'HANDS_WIND_CHILL',
] as const;

export type CyclingReasonCode = (typeof CYCLING_REASON_CODES)[number];

export type CyclingReason = {
  code: CyclingReasonCode;
  params?: Record<string, string | number | boolean>;
};

export type CyclingConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

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

export type CyclingConfigInstruction = {
  code:
    | 'INSTALL_THERMAL_LINER'
    | 'INSTALL_WATERPROOF_LINER'
    | 'VENTS_CLOSED'
    | 'VENTS_OPEN';
  vents?: VentState;
  componentKind?: string;
};

export type CyclingKitItem = {
  mode: 'wear' | 'pack';
  source: 'wardrobe' | 'generic';
  slot: string;
  zone: CyclingZoneId | 'rain';
  garmentId?: string;
  garmentName?: string;
  genericLabel?: string;
  category?: string;
  configuration: CyclingConfigInstruction[];
  effectiveTiers?: {
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
  };
};

export type CyclingTravelSegment = {
  durationMin: number;
  expectedSpeedKmh: number;
  headingDeg?: number | null;
};

export type CyclingSegment = {
  index: number;
  durationMin: number;
  weather: WeatherPoint;
  expectedSpeedKmh: number;
  speedSource: CyclingSpeedSource;
  apparentAirflowMs: number;
  airflowMode: CyclingAirflowMode;
  cyclingExposureC: number;
  warmthDemand: number;
  windDemand: number;
  waterDemand: number;
  isShortExtreme: boolean;
};

export type CyclingDemandSummary = {
  sustained: CyclingZoneDemand[];
  peak: CyclingZoneDemand[];
  sustainedWarmth: number;
  peakWarmth: number;
  sustainedWind: number;
  peakWind: number;
  sustainedWater: number;
  peakWater: number;
  shortExtremeWarmth: number;
  shortExtremeInfluencesPackOnly: boolean;
};

export type CyclingRecommendationResult = {
  engine: 'cycling_v1';
  intensity: CyclingIntensity;
  intensityAssumed: boolean;
  geometry: 'cycling_profile' | 'waypoint_fallback';
  elevation: 'used' | 'unavailable';
  exposure: {
    cyclingExposureMinC: number;
    cyclingExposureMaxC: number;
    cyclingExposureSustainedC: number;
    speedSource: CyclingSpeedSource;
    durationWeightedSpeedKmh: number;
    windDirectionUsed: boolean;
    segments: Array<{
      index: number;
      durationMin: number;
      airTempC: number;
      windSpeedMs: number;
      expectedSpeedKmh: number;
      apparentAirflowMs: number;
      airflowMode: CyclingAirflowMode;
      cyclingExposureC: number;
      groundElevationM: number | null;
      isShortExtreme: boolean;
    }>;
  };
  demand: CyclingDemandSummary;
  wear: CyclingKitItem[];
  pack: CyclingKitItem[];
  reasons: CyclingReason[];
  confidence: {
    level: CyclingConfidenceLevel;
    reasons: CyclingReasonCode[];
  };
  personalization: {
    voice: 'baseline';
    sampleCount: 0;
    canClaimPersonal: false;
    personalColdBiasC: 0;
  };
};

export type CyclingPipelineInput = {
  weather: RouteWeatherSummary;
  wardrobe: CyclingGarmentInput[];
  rideDurationMin: number;
  /** easy | steady | hard. Missing or unknown becomes steady and is flagged. */
  intensity?: string | null;
  routeTravelSegments?: CyclingTravelSegment[];
  /** Saved-waypoint samples because cycling routing was down or unconfigured. */
  geometryFallback: boolean;
};
