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

export type DemoLanguage = 'en' | 'nb';

export function demoLanguage(value?: string | null): DemoLanguage {
  return value === 'nb' ? 'nb' : 'en';
}

export type DemoGarmentSeed = {
  name: string;
  /** Norwegian Bokmål display name used when seeding for `nb`. */
  nameNb: string;
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
    name: 'Demo – Merino 200 base layer',
    nameNb: 'Demo – Merino 200 ullundertøy',
    category: 'base_layer',
    brand: 'Devold',
    model: '200',
    material: 'merino',
    warmthTier: 3,
    notes: 'Classic midweight merino',
  },
  {
    name: 'Demo – Light fleece mid-layer',
    nameNb: 'Demo – Lett fleece-mellomlag',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 3,
  },
  {
    name: 'Demo – Touring jacket',
    nameNb: 'Demo – Touringjakke',
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
    name: 'Demo – Mesh summer jacket',
    nameNb: 'Demo – Mesh-sommerjakke',
    category: 'shell_jacket',
    material: 'mesh',
    hasVentilation: true,
    warmthTier: 1,
    windResistTier: 2,
    waterResistTier: 1,
    breathabilityTier: 5,
  },
  {
    name: 'Demo – Waterproof motorcycle pants',
    nameNb: 'Demo – Vanntett mc-bukse',
    category: 'pants',
    material: 'textile',
    hasVentilation: true,
    warmthTier: 2,
    waterResistTier: 5,
    windResistTier: 4,
    components: [{ kind: 'thermal_liner' }],
  },
  {
    name: 'Demo – Armored motorcycle jeans',
    nameNb: 'Demo – Forsterket mc-jeans',
    category: 'pants',
    material: 'denim',
    warmthTier: 2,
    windResistTier: 3,
    waterResistTier: 1,
  },
  {
    name: 'Demo – Summer gloves',
    nameNb: 'Demo – Sommerhansker',
    category: 'gloves',
    warmthTier: 1,
    windResistTier: 3,
  },
  {
    name: 'Demo – Insulated winter gloves',
    nameNb: 'Demo – Isolerte vinterhansker',
    category: 'gloves',
    warmthTier: 5,
    windResistTier: 5,
    waterResistTier: 4,
  },
  {
    name: 'Demo – Heated gloves',
    nameNb: 'Demo – Varmehansker',
    category: 'gloves',
    isHeated: true,
    warmthTier: 5,
  },
  {
    name: 'Demo – Neck tube',
    nameNb: 'Demo – Halstube',
    category: 'neckwear',
    warmthTier: 2,
  },
  {
    name: 'Demo – Heated vest',
    nameNb: 'Demo – Varmevest',
    category: 'heated_vest',
    isHeated: true,
    warmthTier: 5,
    notes: 'Battery heated; pack when mountain sections are cold',
  },
];

/** Display names for the requested language. `nameNb` is not persisted. */
export function demoWardrobe(language: DemoLanguage = 'en'): DemoGarmentSeed[] {
  return DEMO_MOTORCYCLE_WARDROBE.map((seed) => ({
    ...seed,
    name: language === 'nb' ? seed.nameNb : seed.name,
    nameNb: seed.nameNb,
  }));
}

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
