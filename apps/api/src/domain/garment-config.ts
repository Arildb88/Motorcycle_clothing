/**
 * Motorcycle garment configuration — critical review (pre-M3)
 *
 * ## Does M2 Garment already support real motorcycle clothing?
 *
 * Partially. Static items work: categories + ordinal tiers + body zones +
 * activityTags cover base/mid/shell layering as *separate wardrobe rows*.
 * Gloves already use one category with warmth/water tiers (not forced into
 * exclusive summer/winter enums). Hands remain an independent body zone.
 *
 * ## Gaps before M3
 *
 * 1. Same physical jacket/pants behaves differently with liner in/out and vents.
 * 2. Material (textile / leather / mesh / denim) is not modeled — only generic
 *    shell_jacket / pants.
 * 3. Removable liners must belong to a garment, not appear as unrelated items.
 * 4. Ride-time configuration ≠ wardrobe row (do not duplicate “Klim warm/cold”).
 * 5. Worn evidence for personalization must eventually store configuration.
 *
 * ## Smallest clean extension (chosen)
 *
 * - Keep categories coarse; add optional `material`, `hasVentilation`, `isHeated`.
 * - Add `GarmentComponent` for removable liners (thermal / waterproof) with
 *   ordinal tier *deltas* when installed.
 * - Ventilation *capability* on Garment; open/closed is ride configuration
 *   (stored later on worn evidence — not a second wardrobe garment).
 * - UX presets (mesh jacket, leather jacket, jeans…) map to category+material
 *   + defaults — not dozens of DB enums.
 * - Add `one_piece_suit` category for race/touring one-pieces (`full_body`).
 *
 * ## M3 interaction
 *
 * Engine computes effective tiers = base garment ± installed component deltas,
 * then matches insulation demand. Recommendations may emit structured actions:
 * INSTALL_THERMAL_LINER, VENTS_CLOSED — presentation layer localizes copy.
 *
 * ## Worn configuration (M5-ready, not implemented here)
 *
 * Evolve ActivityLog.wornGarmentIdsJson from string[] toward:
 * [{ garmentId, installedComponentIds[], vents?: 'open'|'closed' }]
 * Learning must use *actual* worn config, not the recommendation.
 *
 * ## Deferred
 *
 * Partial vent positions; clo coefficients; product catalog; auto liner detection;
 * per-section vent advice UI; ActivityGarment table normalize (JSON OK until M5).
 */

export const GARMENT_MATERIALS = [
  'textile',
  'leather',
  'mesh',
  'denim',
  'synthetic',
  'merino',
  'mixed',
  'other',
] as const;
export type GarmentMaterial = (typeof GARMENT_MATERIALS)[number];

export const GARMENT_COMPONENT_KINDS = [
  'thermal_liner',
  'waterproof_liner',
  'other',
] as const;
export type GarmentComponentKind = (typeof GARMENT_COMPONENT_KINDS)[number];

/** Ride-time vent state — not stored on the wardrobe garment itself. */
export const VENT_STATES = ['closed', 'open'] as const;
export type VentState = (typeof VENT_STATES)[number];

export function isGarmentMaterial(value: string): value is GarmentMaterial {
  return (GARMENT_MATERIALS as readonly string[]).includes(value);
}

export function isGarmentComponentKind(
  value: string,
): value is GarmentComponentKind {
  return (GARMENT_COMPONENT_KINDS as readonly string[]).includes(value);
}

export function isVentState(value: string): value is VentState {
  return (VENT_STATES as readonly string[]).includes(value);
}

export type EffectiveTiers = {
  warmthTier: number;
  windResistTier: number;
  waterResistTier: number;
  breathabilityTier: number;
};

export type ComponentDelta = {
  warmthDelta?: number;
  windResistDelta?: number;
  waterResistDelta?: number;
  breathabilityDelta?: number;
};

/** Effective properties when selected components are installed. */
export function effectiveGarmentTiers(
  base: EffectiveTiers,
  installed: ComponentDelta[],
): EffectiveTiers {
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  let warmth = base.warmthTier;
  let wind = base.windResistTier;
  let water = base.waterResistTier;
  let breath = base.breathabilityTier;
  for (const c of installed) {
    warmth += c.warmthDelta ?? 0;
    wind += c.windResistDelta ?? 0;
    water += c.waterResistDelta ?? 0;
    breath += c.breathabilityDelta ?? 0;
  }
  return {
    warmthTier: clamp(warmth),
    windResistTier: clamp(wind),
    waterResistTier: clamp(water),
    breathabilityTier: clamp(breath),
  };
}

/**
 * UX presets → category + material + capability flags + optional tier overrides.
 * Keeps DB enums small while supporting mesh/leather/jeans mental models.
 */
export type GarmentPresetId =
  | 'textile_jacket'
  | 'mesh_jacket'
  | 'leather_jacket'
  | 'textile_pants'
  | 'mesh_pants'
  | 'leather_pants'
  | 'motorcycle_jeans'
  | 'one_piece_suit'
  | 'summer_gloves'
  | 'mid_gloves'
  | 'winter_gloves'
  | 'heated_gloves';

export type GarmentPreset = {
  id: GarmentPresetId;
  label: string;
  category: string;
  material?: GarmentMaterial;
  hasVentilation?: boolean;
  isHeated?: boolean;
  warmthTier?: number;
  windResistTier?: number;
  waterResistTier?: number;
  breathabilityTier?: number;
  suggestedComponents?: GarmentComponentKind[];
};

export const GARMENT_PRESETS: GarmentPreset[] = [
  {
    id: 'textile_jacket',
    label: 'Textile motorcycle jacket',
    category: 'shell_jacket',
    material: 'textile',
    hasVentilation: true,
    suggestedComponents: ['thermal_liner', 'waterproof_liner'],
  },
  {
    id: 'mesh_jacket',
    label: 'Mesh / summer jacket',
    category: 'shell_jacket',
    material: 'mesh',
    hasVentilation: true,
    warmthTier: 1,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 5,
  },
  {
    id: 'leather_jacket',
    label: 'Leather motorcycle jacket',
    category: 'shell_jacket',
    material: 'leather',
    warmthTier: 3,
    windResistTier: 5,
    waterResistTier: 2,
    breathabilityTier: 2,
  },
  {
    id: 'textile_pants',
    label: 'Textile motorcycle pants',
    category: 'pants',
    material: 'textile',
    hasVentilation: true,
    suggestedComponents: ['thermal_liner', 'waterproof_liner'],
  },
  {
    id: 'mesh_pants',
    label: 'Mesh / summer pants',
    category: 'pants',
    material: 'mesh',
    warmthTier: 1,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 5,
  },
  {
    id: 'leather_pants',
    label: 'Leather motorcycle pants',
    category: 'pants',
    material: 'leather',
    warmthTier: 3,
    windResistTier: 5,
    waterResistTier: 2,
  },
  {
    id: 'motorcycle_jeans',
    label: 'Motorcycle jeans',
    category: 'pants',
    material: 'denim',
    warmthTier: 2,
    windResistTier: 3,
    waterResistTier: 1,
    breathabilityTier: 3,
  },
  {
    id: 'one_piece_suit',
    label: 'One-piece suit',
    category: 'one_piece_suit',
    material: 'leather',
    warmthTier: 3,
    windResistTier: 5,
    waterResistTier: 2,
  },
  {
    id: 'summer_gloves',
    label: 'Summer gloves',
    category: 'gloves',
    warmthTier: 1,
    windResistTier: 3,
    waterResistTier: 2,
    breathabilityTier: 4,
  },
  {
    id: 'mid_gloves',
    label: 'Mid-season gloves',
    category: 'gloves',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 3,
  },
  {
    id: 'winter_gloves',
    label: 'Winter / insulated gloves',
    category: 'gloves',
    warmthTier: 5,
    windResistTier: 5,
    waterResistTier: 4,
    breathabilityTier: 2,
  },
  {
    id: 'heated_gloves',
    label: 'Heated gloves',
    category: 'gloves',
    isHeated: true,
    warmthTier: 5,
    windResistTier: 4,
    waterResistTier: 3,
  },
];

export function presetById(id: string): GarmentPreset | undefined {
  return GARMENT_PRESETS.find((p) => p.id === id);
}

/** Default tier deltas when adding a liner component quickly. */
export const COMPONENT_KIND_DEFAULTS: Record<
  GarmentComponentKind,
  Required<ComponentDelta> & { name: string }
> = {
  thermal_liner: {
    name: 'Thermal liner',
    warmthDelta: 2,
    windResistDelta: 0,
    waterResistDelta: 0,
    breathabilityDelta: -1,
  },
  waterproof_liner: {
    name: 'Waterproof liner',
    warmthDelta: 0,
    windResistDelta: 0,
    waterResistDelta: 2,
    breathabilityDelta: -1,
  },
  other: {
    name: 'Component',
    warmthDelta: 0,
    windResistDelta: 0,
    waterResistDelta: 0,
    breathabilityDelta: 0,
  },
};
