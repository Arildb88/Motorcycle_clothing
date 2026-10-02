import { COMPONENT_KIND_DEFAULTS } from './garment-config';
import {
  DEMO_WARDROBE,
  demoWardrobe,
  expandDemoGarment,
} from './demo-wardrobe';
import { BODY_ZONES, CLOTHING_LAYERS } from './enums';
import { matchAlpineKit } from '../recommend/alpine/kit';
import { matchCyclingKit } from '../recommend/cycling/kit';
import { matchWardrobe } from '../recommend/motorcycle/wardrobe-match';
import { matchXcKit } from '../recommend/xc/kit';

const SUPPORTED = [
  'motorcycle',
  'cycling',
  'alpine_skiing',
  'snowboarding',
  'xc_skiing',
] as const;

describe('activity demo wardrobe', () => {
  it('keeps every seed identifiable, localized, and free of hiking', () => {
    const en = demoWardrobe('en');
    const nb = demoWardrobe('nb');
    expect(en).toHaveLength(DEMO_WARDROBE.length);
    expect(nb).toHaveLength(DEMO_WARDROBE.length);
    expect(en.every((seed) => seed.name.startsWith('Demo – '))).toBe(true);
    expect(nb.every((seed) => seed.name.startsWith('Demo – '))).toBe(true);
    expect(new Set(en.map((seed) => seed.name)).size).toBe(en.length);
    expect(new Set(nb.map((seed) => seed.name)).size).toBe(nb.length);
    expect(en.some((seed) => seed.name === 'Demo – Touring jacket')).toBe(true);
    expect(nb.some((seed) => seed.name === 'Demo – Touringjakke')).toBe(true);
    expect(nb.some((seed) => seed.name === 'Demo – Alpin ulltrøye')).toBe(true);
    expect(
      en.some(
        (seed) =>
          seed.name.includes('æ') ||
          seed.name.includes('ø') ||
          seed.name.includes('å'),
      ),
    ).toBe(false);
    expect(nb.some((seed) => /[æøåÆØÅ]/.test(seed.name))).toBe(true);

    const tags = en.flatMap((seed) => seed.activityTags ?? []);
    for (const activity of SUPPORTED) {
      expect(tags).toContain(activity);
    }
    expect(tags).not.toContain('hiking');
    expect(
      en.every((seed) => !(seed.activityTags ?? []).includes('hiking')),
    ).toBe(true);
  });

  it('covers existing layers, body zones, and activity categories', () => {
    const expanded = demoWardrobe('en').map((seed) => expandDemoGarment(seed));
    const layers = new Set(expanded.map((garment) => garment.layer));
    const zones = new Set(expanded.map((garment) => garment.primaryBodyZone));
    for (const layer of CLOTHING_LAYERS) expect(layers.has(layer)).toBe(true);
    for (const zone of BODY_ZONES) expect(zones.has(zone)).toBe(true);

    const byActivity = (activity: string) =>
      expanded.filter((garment) => garment.activityTagsJson.includes(activity));
    for (const activity of ['cycling', 'xc_skiing'] as const) {
      const categories = new Set(
        byActivity(activity).map((garment) => garment.category),
      );
      for (const category of [
        'base_layer',
        'mid_layer',
        'shell_jacket',
        'pants',
        'gloves',
        'socks',
        'headwear',
      ]) {
        expect(categories.has(category)).toBe(true);
      }
    }
    const alpine = new Set(
      byActivity('alpine_skiing').map((garment) => garment.category),
    );
    const snowboard = new Set(
      byActivity('snowboarding').map((garment) => garment.category),
    );
    expect([...alpine].sort()).toEqual([...snowboard].sort());
    for (const category of [
      'base_layer',
      'mid_layer',
      'shell_jacket',
      'pants',
      'gloves',
      'socks',
      'headwear',
      'neckwear',
    ]) {
      expect(alpine.has(category)).toBe(true);
    }
    const motorcycle = new Set(
      byActivity('motorcycle').map((garment) => garment.category),
    );
    for (const category of ['boots', 'rain_layer', 'heated_vest', 'neckwear']) {
      expect(motorcycle.has(category)).toBe(true);
    }
    expect(expanded[0]).not.toHaveProperty('nameNb');
  });

  it('lets each existing engine wear demo garments for that activity', () => {
    const wardrobe = asEngineGarments();
    const cold = zoneDemand(4, 4, 2);

    const cycling = matchCyclingKit({
      demand: {
        sustained: cold('torso', 'legs', 'hands', 'feet', 'head'),
        peak: cold('torso', 'legs', 'hands', 'feet', 'head'),
        sustainedWarmth: 4,
        peakWarmth: 4,
        sustainedWind: 4,
        peakWind: 4,
        sustainedWater: 2,
        peakWater: 2,
        shortExtremeWarmth: 4,
        shortExtremeInfluencesPackOnly: false,
      },
      wardrobe,
      intensity: 'steady',
      maxRainProbPct: 0,
      sustainedExposureC: 2,
    });
    expectWardrobeSlots(
      cycling.wear,
      ['base', 'mid', 'shell', 'legs', 'hands', 'feet', 'head'],
      wardrobe,
      ['cycling'],
    );

    const alpine = matchAlpineKit({
      wornExposureC: -10,
      wornWindMs: 12,
      water: 3,
      spreadC: 8,
      wardrobe,
    });
    expectWardrobeSlots(
      alpine.wear,
      ['base', 'mid', 'shell', 'legs', 'hands', 'feet', 'head', 'neck'],
      wardrobe,
      ['alpine_skiing', 'snowboarding'],
    );
    expect(
      alpine.pack.some(
        (item) => item.slot === 'lighter_mid' && item.source === 'wardrobe',
      ),
    ).toBe(true);

    const xc = matchXcKit({
      demand: {
        sustained: cold('torso', 'legs', 'hands', 'feet', 'head'),
        peak: cold('torso', 'legs', 'hands', 'feet', 'head'),
        sustainedWarmth: 4,
        peakWarmth: 4,
        sustainedWind: 4,
        peakWind: 4,
        sustainedWater: 2,
        peakWater: 2,
        shortExtremeWarmth: 2,
        shortExtremeInfluencesPackOnly: false,
      },
      wardrobe,
      intensity: 'steady',
      style: 'classic',
      sustainedExposureC: 2,
      climbing: false,
    });
    expectWardrobeSlots(
      xc.wear,
      ['base', 'mid', 'shell', 'legs', 'hands', 'feet', 'head'],
      wardrobe,
      ['xc_skiing'],
    );

    const motorcycle = matchWardrobe({
      demand: {
        sustained: cold('torso', 'legs', 'hands', 'feet', 'head', 'neck'),
        peak: cold('torso', 'legs', 'hands', 'feet', 'head', 'neck'),
        shortExtremeWarmth: 4,
        sustainedWarmth: 4,
        peakWarmth: 4,
        shortExtremeInfluencesPackOnly: false,
      },
      wardrobe,
      sustainedExposureC: 2,
      packWarmth: false,
      packRain: false,
    });
    expectWardrobeSlots(
      motorcycle.wear,
      ['shell', 'legs', 'base', 'mid', 'hands', 'feet', 'head'],
      wardrobe,
      ['motorcycle'],
    );
  });
});

function asEngineGarments() {
  return demoWardrobe('en').map((seed, index) => {
    const expanded = expandDemoGarment(seed);
    return {
      id: `demo-${index}`,
      name: expanded.name,
      category: expanded.category,
      layer: expanded.layer,
      primaryBodyZone: expanded.primaryBodyZone,
      warmthTier: expanded.warmthTier,
      windResistTier: expanded.windResistTier,
      waterResistTier: expanded.waterResistTier,
      breathabilityTier: expanded.breathabilityTier,
      material: expanded.material,
      hasVentilation: expanded.hasVentilation,
      isHeated: expanded.isHeated,
      activityTags: JSON.parse(expanded.activityTagsJson) as string[],
      components: (seed.components ?? []).map((component, componentIndex) => {
        const defaults = COMPONENT_KIND_DEFAULTS[component.kind];
        return {
          id: `demo-${index}-c${componentIndex}`,
          kind: component.kind,
          name: component.name ?? defaults.name,
          warmthDelta: defaults.warmthDelta,
          windResistDelta: defaults.windResistDelta,
          waterResistDelta: defaults.waterResistDelta,
          breathabilityDelta: defaults.breathabilityDelta,
        };
      }),
    };
  });
}

function zoneDemand(warmth: number, wind: number, water: number) {
  return <T extends string>(...zones: T[]) =>
    zones.map((zone) => ({ zone, warmth, wind, water }));
}

function expectWardrobeSlots(
  items: Array<{
    slot: string;
    source: string;
    garmentId?: string;
  }>,
  slots: string[],
  wardrobe: Array<{ id: string; activityTags: string[] }>,
  allowedTags: string[],
) {
  for (const slot of slots) {
    const item = items.find((candidate) => candidate.slot === slot);
    expect(item?.source).toBe('wardrobe');
    const garment = wardrobe.find(
      (candidate) => candidate.id === item?.garmentId,
    );
    expect(garment?.activityTags.some((tag) => allowedTags.includes(tag))).toBe(
      true,
    );
  }
}
