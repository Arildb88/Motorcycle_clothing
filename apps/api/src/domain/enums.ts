/**
 * Domain enums and garment category defaults for M1/M2.
 * Used by validation and wardrobe services. Recommendation engine (M3)
 * will consume the same vocabulary — do not invent parallel string sets.
 */

export const ACTIVITY_TYPES = [
  'motorcycle',
  'hiking',
  'xc_skiing',
  'alpine_skiing',
  'snowboarding',
  'cycling',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** MVP ships motorcycle UX only; other values are reserved for later. */
export const MVP_ACTIVITY_TYPE: ActivityType = 'motorcycle';

export const CLOTHING_LAYERS = ['base', 'mid', 'outer', 'accessory'] as const;
export type ClothingLayer = (typeof CLOTHING_LAYERS)[number];

export const BODY_ZONES = [
  'torso',
  'legs',
  'hands',
  'feet',
  'head',
  'neck',
  'full_body',
] as const;
export type BodyZone = (typeof BODY_ZONES)[number];

/**
 * Specific garment kinds. Each maps to a layer + primary body zone +
 * default ordinal property tiers (1–5, not scientific clo values).
 */
export const GARMENT_CATEGORIES = [
  'base_layer',
  'mid_layer',
  'shell_jacket',
  'pants',
  'one_piece_suit',
  'gloves',
  'boots',
  'socks',
  'headwear',
  'neckwear',
  'heated_vest',
  'rain_layer',
] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

/** Ordinal property scale: 1 = low, 5 = high. User-facing, not clo. */
export const TIER_MIN = 1;
export const TIER_MAX = 5;

export const MOTORCYCLE_CATEGORIES = [
  'naked',
  'sport',
  'touring',
  'adventure',
  'cruiser',
  'scooter',
] as const;
export type MotorcycleCategory = (typeof MOTORCYCLE_CATEGORIES)[number];

export const WIND_PROTECTION_LEVELS = [
  'none',
  'low',
  'medium',
  'high',
] as const;
export type WindProtectionLevel = (typeof WIND_PROTECTION_LEVELS)[number];

export const FEEDBACK_RATINGS = [-2, -1, 0, 1, 2] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const RECOMMENDATION_SLOTS = [
  'base',
  'mid',
  'shell',
  'hands',
  'legs',
  'head',
  'feet',
  'rain',
] as const;
export type RecommendationSlot = (typeof RECOMMENDATION_SLOTS)[number];

export const RECOMMENDATION_MODES = ['wear', 'pack'] as const;
export type RecommendationMode = (typeof RECOMMENDATION_MODES)[number];

export type GarmentDefaults = {
  layer: ClothingLayer;
  primaryBodyZone: BodyZone;
  warmthTier: number;
  windResistTier: number;
  waterResistTier: number;
  breathabilityTier: number;
};

/** Category-derived baselines so users need not know textile science. */
export const GARMENT_CATEGORY_DEFAULTS: Record<
  GarmentCategory,
  GarmentDefaults
> = {
  base_layer: {
    layer: 'base',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 1,
    waterResistTier: 1,
    breathabilityTier: 4,
  },
  mid_layer: {
    layer: 'mid',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 3,
  },
  shell_jacket: {
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 2,
    windResistTier: 5,
    waterResistTier: 4,
    breathabilityTier: 3,
  },
  pants: {
    layer: 'outer',
    primaryBodyZone: 'legs',
    warmthTier: 2,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 3,
  },
  one_piece_suit: {
    layer: 'outer',
    primaryBodyZone: 'full_body',
    warmthTier: 3,
    windResistTier: 5,
    waterResistTier: 2,
    breathabilityTier: 2,
  },
  gloves: {
    layer: 'accessory',
    primaryBodyZone: 'hands',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 2,
  },
  boots: {
    layer: 'accessory',
    primaryBodyZone: 'feet',
    warmthTier: 3,
    windResistTier: 3,
    waterResistTier: 4,
    breathabilityTier: 2,
  },
  socks: {
    layer: 'base',
    primaryBodyZone: 'feet',
    warmthTier: 2,
    windResistTier: 1,
    waterResistTier: 1,
    breathabilityTier: 4,
  },
  headwear: {
    layer: 'accessory',
    primaryBodyZone: 'head',
    warmthTier: 2,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 3,
  },
  neckwear: {
    layer: 'accessory',
    primaryBodyZone: 'neck',
    warmthTier: 2,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 3,
  },
  heated_vest: {
    layer: 'mid',
    primaryBodyZone: 'torso',
    warmthTier: 5,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 3,
  },
  rain_layer: {
    layer: 'outer',
    primaryBodyZone: 'full_body',
    warmthTier: 1,
    windResistTier: 4,
    waterResistTier: 5,
    breathabilityTier: 2,
  },
};

export function isGarmentCategory(value: string): value is GarmentCategory {
  return (GARMENT_CATEGORIES as readonly string[]).includes(value);
}

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/** Conceptual route shapes — all represented as ordered waypoints. */
export const ROUTE_KINDS = ['point_to_point', 'multi_stop', 'loop'] as const;
export type RouteKind = (typeof ROUTE_KINDS)[number];

/** Lightweight optional labels — not folders/tags. */
export const ROUTE_CATEGORIES = [
  'work',
  'commute',
  'home',
  'weekend',
  'touring',
  'favourite',
  'custom',
] as const;
export type RouteCategory = (typeof ROUTE_CATEGORIES)[number];

export const WAYPOINT_TYPES = ['start', 'stop', 'end', 'via'] as const;
export type WaypointType = (typeof WAYPOINT_TYPES)[number];

export function isRouteKind(value: string): value is RouteKind {
  return (ROUTE_KINDS as readonly string[]).includes(value);
}

export function isRouteCategory(value: string): value is RouteCategory {
  return (ROUTE_CATEGORIES as readonly string[]).includes(value);
}

export function isWaypointType(value: string): value is WaypointType {
  return (WAYPOINT_TYPES as readonly string[]).includes(value);
}

export function clampTier(value: number): number {
  return Math.min(TIER_MAX, Math.max(TIER_MIN, Math.round(value)));
}

export function defaultsForCategory(category: GarmentCategory): GarmentDefaults {
  return { ...GARMENT_CATEGORY_DEFAULTS[category] };
}
