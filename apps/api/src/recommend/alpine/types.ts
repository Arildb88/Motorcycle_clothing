import type { VentState, ZoneColdBiasC } from '../../domain';
import type { AlpineDiscipline, AlpineExposureMode } from './constants';
import type { WeatherPoint } from '../weather.types';

export type AlpineSiteRole = 'base' | 'mid' | 'upper';

export type AlpineSessionPhase = 'start' | 'middle' | 'end';

export type AlpinePin = {
  lat: number;
  lon: number;
  label?: string | null;
  elevationM?: number | null;
};

export type AlpineSite = {
  role: AlpineSiteRole;
  lat: number;
  lon: number;
  elevationM: number | null;
  estimated: boolean;
  source: 'labeled' | 'elevation_order' | 'midpoint_estimate';
};

export type AlpineUpperForecast = 'ready' | 'missing' | 'elevation_unavailable';

export type AlpineSitePlan = {
  sites: AlpineSite[];
  upperForecast: AlpineUpperForecast;
  /** More than one pin, and height or labels did not identify a summit. */
  sitesNeedLabels: boolean;
};

export type AlpineWeatherRequest = {
  role: AlpineSiteRole;
  lat: number;
  lon: number;
  /** This site's own elevation. Never another site's height. */
  altitudeM: number;
  at: Date;
  estimated: boolean;
  phase: AlpineSessionPhase;
};

export const ALPINE_REASON_CODES = [
  'UPPER_MOUNTAIN_SETS_KIT',
  'STAYING_AT_BASE',
  'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
  'UPPER_SITE_MISSING',
  'UPPER_ELEVATION_UNAVAILABLE',
  'SITES_NEED_LABELS',
  'MID_ELEVATION_ESTIMATED',
  'TEMPERATURE_SPREAD',
  'HIGH_WIND_AT_UPPER',
  'ELEVATION_USED',
  'ELEVATION_PARTIAL',
  'ELEVATION_UNAVAILABLE',
  'INCOMPLETE_WEATHER',
  'ASSUMED_EXPOSURE_MODE',
  'GENERIC_ALPINE_KIT',
  'WARDROBE_GAP',
  'LEAVE_WARMER_LAYER_OFF_HILL',
  'BOOTS_ARE_EQUIPMENT',
  'GOGGLES_ARE_EQUIPMENT',
  'HELMET_IS_EQUIPMENT',
  'BASELINE_NO_PERSONAL_EVIDENCE',
] as const;

export type AlpineReasonCode = (typeof ALPINE_REASON_CODES)[number];

export type AlpineReason = {
  code: AlpineReasonCode;
  params?: Record<string, string | number | boolean>;
};

export type AlpineZoneId =
  'torso' | 'legs' | 'hands' | 'feet' | 'head' | 'neck';

export type AlpineGarmentInput = {
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

export type AlpineConfigInstruction = {
  code:
    | 'INSTALL_THERMAL_LINER'
    | 'INSTALL_WATERPROOF_LINER'
    | 'VENTS_CLOSED'
    | 'VENTS_OPEN';
  vents?: VentState;
  componentKind?: string;
};

export type AlpineKitItem = {
  mode: 'wear' | 'pack';
  source: 'wardrobe' | 'generic';
  slot: string;
  zone: AlpineZoneId;
  garmentId?: string;
  garmentName?: string;
  genericLabel?: string;
  category?: string;
  configuration: AlpineConfigInstruction[];
  effectiveTiers?: {
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
  };
};

export type AlpineSample = {
  role: AlpineSiteRole;
  phase: AlpineSessionPhase;
  estimated: boolean;
  weather: WeatherPoint;
};

export type AlpineWornFrom =
  'upper' | 'colder_site' | 'base' | 'base_only_not_summit' | 'unavailable';

export type AlpineRecommendationResult = {
  engine: 'alpine_v1';
  discipline: AlpineDiscipline;
  exposureMode: AlpineExposureMode;
  exposureModeAssumed: boolean;
  elevation: 'used' | 'partial' | 'unavailable';
  exposure: {
    villageUsedAsSummit: false;
    wornFrom: AlpineWornFrom;
    wornExposureC: number | null;
    baseTempC: number | null;
    midTempC: number | null;
    upperTempC: number | null;
    maxWindMs: number;
    maxPrecipitationProbPct: number | null;
    upperWindMs: number | null;
    sites: AlpineSite[];
    samples: Array<{
      role: AlpineSiteRole;
      phase: AlpineSessionPhase;
      estimated: boolean;
      lat: number;
      lon: number;
      airTempC: number;
      windSpeedMs: number;
      groundElevationM: number | null;
      exposureC: number;
    }>;
  };
  wear: AlpineKitItem[];
  pack: AlpineKitItem[];
  reasons: AlpineReason[];
  confidence: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    reasons: AlpineReasonCode[];
  };
  personalization: {
    voice: 'baseline';
    sampleCount: number;
    canClaimPersonal: false;
    personalColdBiasC: number;
  };
};

export type AlpinePipelineInput = {
  discipline: AlpineDiscipline;
  exposureMode?: string | null;
  durationMin: number;
  plan: AlpineSitePlan;
  samples: AlpineSample[];
  wardrobe: AlpineGarmentInput[];
  /** This discipline's shrunk feedback. Omitted or 0 leaves exposure unchanged. */
  personalColdBiasC?: number;
  /** Torso and legs feedback. Omitted or zero leaves those zones unchanged. */
  zoneColdBiasC?: ZoneColdBiasC;
  personalSampleCount?: number;
};
