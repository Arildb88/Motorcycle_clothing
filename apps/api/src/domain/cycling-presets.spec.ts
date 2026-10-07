import { defaultsForCategory } from './enums';
import {
  CYCLING_TRIATHLON_ZONES,
  CYCLING_WARMTH_BAND_TIER,
  GARMENT_PRESETS,
  isCyclingGarmentPreset,
  presetById,
} from './garment-config';

const CYCLING_IDS = [
  'cycling_long_trousers',
  'cycling_shorts',
  'cycling_triathlon_suit',
  'cycling_short_sleeve_tee',
  'cycling_long_jersey',
  'cycling_jacket',
  'cycling_fingerless_gloves',
  'cycling_full_finger_gloves',
] as const;

describe('cycling garment presets', () => {
  it('maps all eight choices onto existing categories and body zones', () => {
    expect(CYCLING_IDS.map((id) => presetById(id)?.category)).toEqual([
      'pants',
      'pants',
      'one_piece_suit',
      'base_layer',
      'base_layer',
      'shell_jacket',
      'gloves',
      'gloves',
    ]);
    for (const id of CYCLING_IDS) {
      const preset = presetById(id);
      expect(preset).toBeDefined();
      expect(isCyclingGarmentPreset(id)).toBe(true);
      const defaults = defaultsForCategory(
        preset!.category as
          'pants' | 'one_piece_suit' | 'base_layer' | 'shell_jacket' | 'gloves',
      );
      expect(defaults.primaryBodyZone).not.toBe('head');
    }
    expect(defaultsForCategory('pants').primaryBodyZone).toBe('legs');
    expect(defaultsForCategory('base_layer').primaryBodyZone).toBe('torso');
    expect(defaultsForCategory('shell_jacket').primaryBodyZone).toBe('torso');
    expect(defaultsForCategory('gloves').primaryBodyZone).toBe('hands');
    expect(defaultsForCategory('one_piece_suit').primaryBodyZone).toBe(
      'full_body',
    );
    expect(CYCLING_TRIATHLON_ZONES).toEqual(['torso', 'legs']);
  });

  it('keeps a short technical tee light and maps thin medium warm onto 1–5', () => {
    const tee = presetById('cycling_short_sleeve_tee');
    expect(tee?.warmthTier).toBe(1);
    expect(tee?.warmthBands).toBeUndefined();
    expect(presetById('cycling_shorts')?.warmthTier).toBe(1);
    expect(presetById('cycling_fingerless_gloves')?.warmthTier).toBe(1);
    expect(presetById('cycling_full_finger_gloves')?.warmthTier).toBe(2);
    for (const id of [
      'cycling_long_trousers',
      'cycling_long_jersey',
      'cycling_jacket',
    ]) {
      expect(presetById(id)?.warmthBands).toBe(true);
      expect(presetById(id)?.warmthTier).toBe(CYCLING_WARMTH_BAND_TIER.thin);
    }
    expect(CYCLING_WARMTH_BAND_TIER).toEqual({ thin: 2, medium: 3, warm: 4 });
    expect(
      Object.values(CYCLING_WARMTH_BAND_TIER).every(
        (tier) => tier >= 1 && tier <= 5,
      ),
    ).toBe(true);
  });

  it('does not replace motorcycle presets', () => {
    expect(presetById('textile_jacket')?.category).toBe('shell_jacket');
    expect(presetById('motorcycle_jeans')?.material).toBe('denim');
    expect(
      GARMENT_PRESETS.some((preset) => preset.id === 'textile_jacket'),
    ).toBe(true);
    expect(isCyclingGarmentPreset('textile_jacket')).toBe(false);
  });
});
