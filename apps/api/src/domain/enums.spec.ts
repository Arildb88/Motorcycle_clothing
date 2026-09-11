import {
  GARMENT_CATEGORY_DEFAULTS,
  clampTier,
  defaultsForCategory,
  isGarmentCategory,
  isActivityType,
  isRouteKind,
  isRouteCategory,
} from './enums';
import { expandDemoGarment, DEMO_MOTORCYCLE_WARDROBE } from './demo-wardrobe';

describe('domain enums', () => {
  it('recognizes garment categories and rejects unknowns', () => {
    expect(isGarmentCategory('base_layer')).toBe(true);
    expect(isGarmentCategory('poncho')).toBe(false);
  });

  it('recognizes activity types including future sports', () => {
    expect(isActivityType('motorcycle')).toBe(true);
    expect(isActivityType('hiking')).toBe(true);
    expect(isActivityType('surfing')).toBe(false);
  });

  it('recognizes route kinds and categories', () => {
    expect(isRouteKind('loop')).toBe(true);
    expect(isRouteKind('shortcut')).toBe(false);
    expect(isRouteCategory('work')).toBe(true);
    expect(isRouteCategory('folder')).toBe(false);
  });

  it('maps categories to layer and body zone', () => {
    expect(defaultsForCategory('gloves')).toMatchObject({
      layer: 'accessory',
      primaryBodyZone: 'hands',
    });
    expect(defaultsForCategory('base_layer').layer).toBe('base');
    expect(defaultsForCategory('shell_jacket').layer).toBe('outer');
  });

  it('clamps ordinal tiers to 1–5', () => {
    expect(clampTier(0)).toBe(1);
    expect(clampTier(9)).toBe(5);
    expect(clampTier(3.4)).toBe(3);
  });

  it('provides defaults for every category', () => {
    for (const category of Object.keys(GARMENT_CATEGORY_DEFAULTS)) {
      const d = defaultsForCategory(category as keyof typeof GARMENT_CATEGORY_DEFAULTS);
      expect(d.warmthTier).toBeGreaterThanOrEqual(1);
      expect(d.warmthTier).toBeLessThanOrEqual(5);
    }
  });
});

describe('demo wardrobe', () => {
  it('expands seeds with category defaults', () => {
    expect(DEMO_MOTORCYCLE_WARDROBE.length).toBeGreaterThanOrEqual(8);
    const merino = expandDemoGarment(DEMO_MOTORCYCLE_WARDROBE[0]);
    expect(merino.layer).toBe('base');
    expect(merino.activityTagsJson).toContain('motorcycle');
  });
});
