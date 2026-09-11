import {
  ActivityType,
  GarmentCategory,
  MVP_ACTIVITY_TYPE,
  defaultsForCategory,
} from './enums';
import type {
  GarmentComponentKind,
  GarmentMaterial,
} from './garment-config';

export type DemoComponentSeed = {
  kind: GarmentComponentKind;
  name?: string;
};

export type DemoGarmentSeed = {
  name: string;
  category: GarmentCategory;
  brand?: string;
  model?: string;
  material?: GarmentMaterial;
  hasVentilation?: boolean;
  isHeated?: boolean;
  warmthTier?: number;
  windResistTier?: number;
  waterResistTier?: number;
  breathabilityTier?: number;
  notes?: string;
  activityTags?: ActivityType[];
  components?: DemoComponentSeed[];
};

/**
 * Realistic demo wardrobe for development / engine testing later.
 * Not used automatically in production registration.
 */
export const DEMO_MOTORCYCLE_WARDROBE: DemoGarmentSeed[] = [
  {
    name: 'Merino 200 base layer',
    category: 'base_layer',
    brand: 'Devold',
    model: '200',
    material: 'merino',
    warmthTier: 3,
    notes: 'Classic midweight merino',
  },
  {
    name: 'Light fleece mid-layer',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 3,
  },
  {
    name: 'Touring textile jacket',
    category: 'shell_jacket',
    brand: 'Klim',
    material: 'textile',
    hasVentilation: true,
    warmthTier: 2,
    windResistTier: 5,
    waterResistTier: 4,
    components: [{ kind: 'thermal_liner' }, { kind: 'waterproof_liner' }],
  },
  {
    name: 'Mesh summer jacket',
    category: 'shell_jacket',
    material: 'mesh',
    hasVentilation: true,
    warmthTier: 1,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 5,
  },
  {
    name: 'Waterproof motorcycle pants',
    category: 'pants',
    material: 'textile',
    hasVentilation: true,
    warmthTier: 2,
    waterResistTier: 5,
    windResistTier: 4,
    components: [{ kind: 'thermal_liner' }],
  },
  {
    name: 'Armored motorcycle jeans',
    category: 'pants',
    material: 'denim',
    warmthTier: 2,
    windResistTier: 3,
    waterResistTier: 1,
  },
  {
    name: 'Summer gloves',
    category: 'gloves',
    warmthTier: 1,
    windResistTier: 3,
  },
  {
    name: 'Insulated winter gloves',
    category: 'gloves',
    warmthTier: 5,
    windResistTier: 5,
    waterResistTier: 4,
  },
  {
    name: 'Heated gloves',
    category: 'gloves',
    isHeated: true,
    warmthTier: 5,
  },
  {
    name: 'Neck tube',
    category: 'neckwear',
    warmthTier: 2,
  },
  {
    name: 'Heated vest',
    category: 'heated_vest',
    isHeated: true,
    warmthTier: 5,
    notes: 'Battery heated; pack when mountain sections are cold',
  },
];

export function expandDemoGarment(seed: DemoGarmentSeed) {
  const defaults = defaultsForCategory(seed.category);
  return {
    name: seed.name,
    category: seed.category,
    layer: defaults.layer,
    primaryBodyZone: defaults.primaryBodyZone,
    warmthTier: seed.warmthTier ?? defaults.warmthTier,
    windResistTier: seed.windResistTier ?? defaults.windResistTier,
    waterResistTier: seed.waterResistTier ?? defaults.waterResistTier,
    breathabilityTier:
      seed.breathabilityTier ?? defaults.breathabilityTier,
    material: seed.material ?? null,
    hasVentilation: seed.hasVentilation ?? false,
    isHeated: seed.isHeated ?? false,
    brand: seed.brand ?? null,
    model: seed.model ?? null,
    notes: seed.notes ?? null,
    activityTagsJson: JSON.stringify(seed.activityTags ?? [MVP_ACTIVITY_TYPE]),
  };
}
