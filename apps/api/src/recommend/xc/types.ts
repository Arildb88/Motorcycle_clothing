import type { VentState } from '../../domain';
import type { XcIntensity, XcStyle } from './constants';
import type { WeatherPoint, RouteWeatherSummary } from '../weather.types';

export type { XcIntensity, XcStyle };

export const XC_REASON_CODES = [
  'MILD_CONDITIONS',
  'SUSTAINED_COLD_EXPOSURE',
  'SHORT_COLD_STOP_PACKED',
  'RAIN_PROTECTION_REQUIRED',
  'PACK_SHELL',
  'HIGH_WIND_EXPOSURE',
  'TEMPERATURE_VARIATION',
  'VENTS_FOR_CLIMB',
  'WARDROBE_GAP',
  'INCOMPLETE_WEATHER',
  'INCOMPLETE_WARDROBE',
  'GENERIC_XC_KIT',
  'ASSUMED_INTENSITY',
  'ASSUMED_DURATION',
  'STYLE_NOT_SPECIFIED',
  'CLASSIC_BOOTS_ARE_EQUIPMENT',
  'SKATE_BOOTS_ARE_EQUIPMENT',
  'ELEVATION_USED',
  'ELEVATION_PARTIAL',
  'ELEVATION_UNAVAILABLE',
  'USER_TRACK_NOT_ROAD',
  'CLIMB_REDUCES_WORN_DEMAND',
  'BASELINE_NO_PERSONAL_EVIDENCE',
  'NO_GROOMING_STATUS',
  'NO_WAX_ADVICE',
] as const;

export type XcReasonCode = (typeof XC_REASON_CODES)[number];

export type XcReason = {
  code: XcReasonCode;
  params?: Record<string, string | number | boolean>;
};

export type XcConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type XcZoneId = 'torso' | 'legs' | 'hands' | 'feet' | 'head';

export type XcZoneDemand = {
  zone: XcZoneId;
  warmth: number;
  wind: number;
  water: number;
};

export type XcGarmentInput = {
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

export type XcConfigInstruction = {
  code:
    | 'INSTALL_THERMAL_LINER'
    | 'INSTALL_WATERPROOF_LINER'
    | 'VENTS_CLOSED'
    | 'VENTS_OPEN';
  vents?: VentState;
  componentKind?: string;
};

export type XcKitItem = {
  mode: 'wear' | 'pack';
  source: 'wardrobe' | 'generic';
  slot: string;
  zone: XcZoneId | 'hands';
  garmentId?: string;
  garmentName?: string;
  genericLabel?: string;
  category?: string;
  configuration: XcConfigInstruction[];
  effectiveTiers?: {
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
  };
};

export type XcSegment = {
  index: number;
  durationMin: number;
  weather: WeatherPoint;
  climbing: boolean;
  exposureC: number;
  warmthDemand: number;
  windDemand: number;
  waterDemand: number;
  isShortExtreme: boolean;
};

export type XcDemandSummary = {
  sustained: XcZoneDemand[];
  peak: XcZoneDemand[];
  sustainedWarmth: number;
  peakWarmth: number;
  sustainedWind: number;
  peakWind: number;
  sustainedWater: number;
  peakWater: number;
  shortExtremeWarmth: number;
  shortExtremeInfluencesPackOnly: boolean;
};

export type XcElevationState = 'used' | 'partial' | 'unavailable';

export type XcRecommendationResult = {
  engine: 'xc_v1';
  intensity: XcIntensity;
  intensityAssumed: boolean;
  style: XcStyle | null;
  durationAssumed: boolean;
  line: 'user_waypoints';
  elevation: XcElevationState;
  exposure: {
    xcExposureMinC: number;
    xcExposureMaxC: number;
    xcExposureSustainedC: number;
    segments: Array<{
      index: number;
      durationMin: number;
      airTempC: number;
      windSpeedMs: number;
      exposureC: number;
      groundElevationM: number | null;
      forecastAt: string | null;
      climbing: boolean;
      isShortExtreme: boolean;
    }>;
  };
  demand: XcDemandSummary;
  wear: XcKitItem[];
  pack: XcKitItem[];
  reasons: XcReason[];
  confidence: {
    level: XcConfidenceLevel;
    reasons: XcReasonCode[];
  };
  personalization: {
    voice: 'baseline';
    sampleCount: 0;
    canClaimPersonal: false;
    personalColdBiasC: 0;
  };
};

export type XcPipelineInput = {
  weather: RouteWeatherSummary;
  wardrobe: XcGarmentInput[];
  durationMin: number;
  durationAssumed: boolean;
  /** easy | steady | hard. Missing or unknown becomes steady and is flagged. */
  intensity?: string | null;
  /**
   * classic | skate. A tag for equipment notes. It does not select an engine.
   * Missing stays unspecified.
   */
  style?: string | null;
  /** Minutes for each weather point, same order. Even split when omitted. */
  sampleDurationMin?: number[];
};
