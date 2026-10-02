import {
  ActivityType,
  GarmentCategory,
  MVP_ACTIVITY_TYPE,
  defaultsForCategory,
} from './enums';
import type { GarmentComponentKind, GarmentMaterial } from './garment-config';

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
 * Demo wardrobe for end-to-end testing of the existing recommendation engines.
 * Not used automatically in production registration.
 *
 * Alpine skiing and snowboarding share one exposure engine and the same
 * clothing rows. Hiking is intentionally absent.
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
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Light fleece mid-layer',
    nameNb: 'Demo – Lett fleece-mellomlag',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 3,
    activityTags: ['motorcycle'],
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
    activityTags: ['motorcycle'],
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
    activityTags: ['motorcycle'],
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
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Armored motorcycle jeans',
    nameNb: 'Demo – Forsterket mc-jeans',
    category: 'pants',
    material: 'denim',
    warmthTier: 2,
    windResistTier: 3,
    waterResistTier: 1,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Summer gloves',
    nameNb: 'Demo – Sommerhansker',
    category: 'gloves',
    warmthTier: 1,
    windResistTier: 3,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Insulated winter gloves',
    nameNb: 'Demo – Isolerte vinterhansker',
    category: 'gloves',
    warmthTier: 5,
    windResistTier: 5,
    waterResistTier: 4,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Heated gloves',
    nameNb: 'Demo – Varmehansker',
    category: 'gloves',
    isHeated: true,
    warmthTier: 5,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Textile motorcycle boots',
    nameNb: 'Demo – Tekstil mc-støvler',
    category: 'boots',
    material: 'textile',
    warmthTier: 4,
    windResistTier: 4,
    waterResistTier: 4,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Merino motorcycle socks',
    nameNb: 'Demo – Merino mc-sokker',
    category: 'socks',
    material: 'merino',
    warmthTier: 3,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Balaclava',
    nameNb: 'Demo – Balaklava',
    category: 'headwear',
    warmthTier: 4,
    windResistTier: 4,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Neck tube',
    nameNb: 'Demo – Halstube',
    category: 'neckwear',
    warmthTier: 2,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Motorcycle rain suit',
    nameNb: 'Demo – Mc-regndress',
    category: 'rain_layer',
    material: 'textile',
    warmthTier: 1,
    windResistTier: 4,
    waterResistTier: 5,
    activityTags: ['motorcycle'],
  },
  {
    name: 'Demo – Heated vest',
    nameNb: 'Demo – Varmevest',
    category: 'heated_vest',
    isHeated: true,
    warmthTier: 5,
    notes: 'Battery heated; pack when mountain sections are cold',
    activityTags: ['motorcycle'],
  },
];

/** Cycling rows use only categories the cycling kit already matches. */
export const DEMO_CYCLING_WARDROBE: DemoGarmentSeed[] = [
  {
    name: 'Demo – Cycling base layer',
    nameNb: 'Demo – Sykkeltrøye ull',
    category: 'base_layer',
    material: 'merino',
    warmthTier: 2,
    breathabilityTier: 5,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Cycling vest',
    nameNb: 'Demo – Sykkelvest',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 2,
    windResistTier: 2,
    breathabilityTier: 4,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Packable cycling shell',
    nameNb: 'Demo – Pakkbar sykkelskalljakke',
    category: 'shell_jacket',
    material: 'textile',
    hasVentilation: true,
    warmthTier: 2,
    windResistTier: 4,
    waterResistTier: 4,
    breathabilityTier: 3,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Cycling tights',
    nameNb: 'Demo – Lange sykkeltights',
    category: 'pants',
    material: 'synthetic',
    warmthTier: 3,
    windResistTier: 3,
    waterResistTier: 2,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Light cycling shorts',
    nameNb: 'Demo – Lette sykkelshorts',
    category: 'pants',
    material: 'synthetic',
    warmthTier: 1,
    breathabilityTier: 5,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Light cycling gloves',
    nameNb: 'Demo – Lette sykkelhansker',
    category: 'gloves',
    warmthTier: 2,
    windResistTier: 2,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Winter cycling gloves',
    nameNb: 'Demo – Vintersykkelhansker',
    category: 'gloves',
    warmthTier: 4,
    windResistTier: 4,
    waterResistTier: 3,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Cycling shoe covers',
    nameNb: 'Demo – Skoovertrekk for sykkel',
    category: 'boots',
    material: 'textile',
    warmthTier: 2,
    windResistTier: 4,
    waterResistTier: 3,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Cycling socks',
    nameNb: 'Demo – Sykkelsokker',
    category: 'socks',
    material: 'merino',
    warmthTier: 2,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Cycling cap',
    nameNb: 'Demo – Sykkelcaps',
    category: 'headwear',
    warmthTier: 2,
    windResistTier: 2,
    activityTags: ['cycling'],
  },
  {
    name: 'Demo – Packable cycling rain shell',
    nameNb: 'Demo – Pakkbar sykkelregnjakke',
    category: 'rain_layer',
    material: 'textile',
    warmthTier: 1,
    windResistTier: 3,
    waterResistTier: 5,
    activityTags: ['cycling'],
  },
];

/**
 * Shared alpine/snowboard clothing. Boots stay equipment in that engine,
 * so feet are socks. The kit does not use heated vests or one-piece suits.
 */
export const DEMO_ALPINE_WARDROBE: DemoGarmentSeed[] = [
  {
    name: 'Demo – Alpine merino base layer',
    nameNb: 'Demo – Alpin ulltrøye',
    category: 'base_layer',
    material: 'merino',
    warmthTier: 3,
    breathabilityTier: 4,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Light alpine fleece',
    nameNb: 'Demo – Lett alpin fleece',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 2,
    windResistTier: 2,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Insulated alpine mid layer',
    nameNb: 'Demo – Isolert alpin mellomlag',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 4,
    windResistTier: 2,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Alpine shell jacket',
    nameNb: 'Demo – Alpin skalljakke',
    category: 'shell_jacket',
    material: 'textile',
    hasVentilation: true,
    warmthTier: 3,
    windResistTier: 5,
    waterResistTier: 5,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Alpine shell pants',
    nameNb: 'Demo – Alpin skallbukse',
    category: 'pants',
    material: 'textile',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 5,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Alpine gloves',
    nameNb: 'Demo – Alpinhansker',
    category: 'gloves',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 3,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Insulated alpine mittens',
    nameNb: 'Demo – Isolerte alpin-votter',
    category: 'gloves',
    warmthTier: 5,
    windResistTier: 5,
    waterResistTier: 4,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Alpine ski socks',
    nameNb: 'Demo – Alpinsokker',
    category: 'socks',
    material: 'merino',
    warmthTier: 3,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Helmet liner',
    nameNb: 'Demo – Hjelmfôr',
    category: 'headwear',
    warmthTier: 3,
    windResistTier: 3,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
  {
    name: 'Demo – Alpine neck gaiter',
    nameNb: 'Demo – Alpin halsgamasj',
    category: 'neckwear',
    warmthTier: 3,
    windResistTier: 3,
    activityTags: ['alpine_skiing', 'snowboarding'],
  },
];

/** Cross-country rows stay thin. Ski boots stay equipment, so feet are socks. */
export const DEMO_XC_WARDROBE: DemoGarmentSeed[] = [
  {
    name: 'Demo – Thin XC base layer',
    nameNb: 'Demo – Tynn langrennsulltrøye',
    category: 'base_layer',
    material: 'merino',
    warmthTier: 2,
    breathabilityTier: 5,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – Light XC vest',
    nameNb: 'Demo – Lett langrennsvest',
    category: 'mid_layer',
    material: 'synthetic',
    warmthTier: 2,
    windResistTier: 1,
    breathabilityTier: 4,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – Thin XC shell',
    nameNb: 'Demo – Tynn langrenns-skalljakke',
    category: 'shell_jacket',
    material: 'textile',
    hasVentilation: true,
    warmthTier: 2,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 4,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – XC tights',
    nameNb: 'Demo – Langrennstights',
    category: 'pants',
    material: 'synthetic',
    warmthTier: 2,
    windResistTier: 2,
    waterResistTier: 2,
    breathabilityTier: 4,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – Light XC gloves',
    nameNb: 'Demo – Lette langrennshansker',
    category: 'gloves',
    warmthTier: 2,
    windResistTier: 2,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – Warmer XC gloves',
    nameNb: 'Demo – Varmere langrennshansker',
    category: 'gloves',
    warmthTier: 4,
    windResistTier: 3,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – XC ski socks',
    nameNb: 'Demo – Langrennssokker',
    category: 'socks',
    material: 'merino',
    warmthTier: 3,
    activityTags: ['xc_skiing'],
  },
  {
    name: 'Demo – Thin XC hat',
    nameNb: 'Demo – Tynn langrennslue',
    category: 'headwear',
    warmthTier: 2,
    windResistTier: 2,
    activityTags: ['xc_skiing'],
  },
];

export const DEMO_WARDROBE: DemoGarmentSeed[] = [
  ...DEMO_MOTORCYCLE_WARDROBE,
  ...DEMO_CYCLING_WARDROBE,
  ...DEMO_ALPINE_WARDROBE,
  ...DEMO_XC_WARDROBE,
];

/** Display names for the requested language. `nameNb` is not persisted. */
export function demoWardrobe(language: DemoLanguage = 'en'): DemoGarmentSeed[] {
  return DEMO_WARDROBE.map((seed) => ({
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
    breathabilityTier: seed.breathabilityTier ?? defaults.breathabilityTier,
    material: seed.material ?? null,
    hasVentilation: seed.hasVentilation ?? false,
    isHeated: seed.isHeated ?? false,
    brand: seed.brand ?? null,
    model: seed.model ?? null,
    notes: seed.notes ?? null,
    activityTagsJson: JSON.stringify(seed.activityTags ?? [MVP_ACTIVITY_TYPE]),
  };
}
