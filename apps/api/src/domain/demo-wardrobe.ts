import {
  ActivityType,
  GarmentCategory,
  MVP_ACTIVITY_TYPE,
  defaultsForCategory,
} from './enums';

export type DemoGarmentSeed = {
  name: string;
  category: GarmentCategory;
  brand?: string;
  model?: string;
  warmthTier?: number;
  windResistTier?: number;
  waterResistTier?: number;
  breathabilityTier?: number;
  notes?: string;
  activityTags?: ActivityType[];
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
    warmthTier: 3,
    notes: 'Classic midweight merino',
  },
  {
    name: 'Light fleece mid-layer',
    category: 'mid_layer',
    warmthTier: 3,
  },
  {
    name: 'Textile motorcycle jacket',
    category: 'shell_jacket',
    brand: 'Klim',
    warmthTier: 2,
    windResistTier: 5,
    waterResistTier: 4,
  },
  {
    name: 'Waterproof motorcycle pants',
    category: 'pants',
    warmthTier: 2,
    waterResistTier: 5,
    windResistTier: 4,
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
    name: 'Neck tube',
    category: 'neckwear',
    warmthTier: 2,
  },
  {
    name: 'Heated vest',
    category: 'heated_vest',
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
    brand: seed.brand ?? null,
    model: seed.model ?? null,
    notes: seed.notes ?? null,
    activityTagsJson: JSON.stringify(seed.activityTags ?? [MVP_ACTIVITY_TYPE]),
  };
}
