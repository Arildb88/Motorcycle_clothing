import { prepareRecommendationWardrobe } from '../domain/wardrobe-sharing';
import { explainKitItems } from './explain-kit';
import { runAlpineRecommendationPipeline } from './alpine/pipeline';
import { resolveAlpineSites } from './alpine/sites';
import { runCyclingRecommendationPipeline } from './cycling/pipeline';
import { runMotorcycleRecommendationPipeline } from './motorcycle/pipeline';
import { runXcRecommendationPipeline } from './xc/pipeline';
import type { AlpineGarmentInput } from './alpine/types';
import type { CyclingGarmentInput } from './cycling/types';
import type { GarmentInput } from './motorcycle/types';
import type { XcGarmentInput } from './xc/types';
import type { RouteWeatherSummary, WeatherPoint } from './weather.types';

function point(overrides: Partial<WeatherPoint> = {}): WeatherPoint {
  return {
    lat: 59.9,
    lon: 10.7,
    airTempC: 8,
    precipitationProbPct: 0,
    precipitationMm: 0,
    windSpeedMs: 2,
    ...overrides,
  };
}

function weather(points: WeatherPoint[]): RouteWeatherSummary {
  return {
    provider: 'mock',
    sampledAt: '2026-10-02T12:00:00.000Z',
    points,
    minTempC: Math.min(...points.map((item) => item.airTempC)),
    maxTempC: Math.max(...points.map((item) => item.airTempC)),
    maxRainProbPct: Math.max(...points.map((item) => item.precipitationProbPct)),
    maxPrecipMm: Math.max(...points.map((item) => item.precipitationMm)),
    maxWindMs: Math.max(...points.map((item) => item.windSpeedMs)),
    elevation: null,
  };
}

function codesOf(reasons: ReadonlyArray<{ code: string }>): string[] {
  return reasons.map((reason) => reason.code);
}

function assertSubset(
  because: readonly string[],
  emitted: readonly string[],
): void {
  for (const code of because) {
    expect(emitted).toContain(code);
    expect(code.startsWith('PERSONAL_')).toBe(false);
  }
}

describe('recommendation explanations', () => {
  it('keeps only emitted codes that the slot rule actually uses', () => {
    const [shell, gloves, rain] = explainKitItems(
      'motorcycle_v1',
      [
        {
          mode: 'wear',
          slot: 'shell',
          source: 'wardrobe',
          configuration: [{ code: 'INSTALL_THERMAL_LINER' }],
        },
        {
          mode: 'wear',
          slot: 'hands',
          source: 'generic',
          configuration: [],
        },
        {
          mode: 'pack',
          slot: 'rain',
          source: 'wardrobe',
          configuration: [],
        },
      ],
      [
        { code: 'SUSTAINED_COLD_EXPOSURE' },
        { code: 'HIGH_WIND_EXPOSURE' },
        { code: 'RAIN_PROTECTION_REQUIRED' },
        { code: 'PACK_RAIN_LAYER' },
        { code: 'THERMAL_LINER_RECOMMENDED' },
        { code: 'INCOMPLETE_WEATHER' },
        { code: 'BASELINE_NO_PERSONAL_EVIDENCE' },
        { code: 'ELEVATION_USED' },
        { code: 'PERSONAL_COLD_HANDS_HISTORY' },
        {
          code: 'WARDROBE_GAP',
          params: { slot: 'hands', genericLabel: 'gloves' },
        },
      ],
    );

    expect(shell.because).toEqual([
      'SUSTAINED_COLD_EXPOSURE',
      'HIGH_WIND_EXPOSURE',
      'RAIN_PROTECTION_REQUIRED',
      'THERMAL_LINER_RECOMMENDED',
    ]);
    expect(gloves.because).toEqual([
      'SUSTAINED_COLD_EXPOSURE',
      'HIGH_WIND_EXPOSURE',
      'WARDROBE_GAP',
    ]);
    expect(rain.because).toEqual(['PACK_RAIN_LAYER']);
    expect(rain.because).not.toContain('RAIN_PROTECTION_REQUIRED');
    expect(shell.because).not.toContain('PACK_RAIN_LAYER');
  });

  it('does not explain a liner or a wardrobe gap the item did not use', () => {
    const [plain, otherGap] = explainKitItems(
      'motorcycle_v1',
      [
        { mode: 'wear', slot: 'shell', source: 'wardrobe', configuration: [] },
        { mode: 'wear', slot: 'legs', source: 'wardrobe', configuration: [] },
      ],
      [
        { code: 'THERMAL_LINER_RECOMMENDED' },
        { code: 'WARDROBE_GAP', params: { slot: 'hands' } },
        { code: 'MILD_CONDITIONS' },
      ],
    );

    expect(plain.because).toEqual(['MILD_CONDITIONS']);
    expect(otherGap.because).toEqual(['MILD_CONDITIONS']);
  });

  it('returns no explanation when the engine or the reasons are missing', () => {
    const [item] = explainKitItems(
      'unknown_engine',
      [{ mode: 'wear', slot: 'shell', source: 'generic' }],
      [{ code: 'SUSTAINED_COLD_EXPOSURE' }, { code: 'WARDROBE_GAP' }],
    );
    expect(item.because).toEqual([]);

    const [empty] = explainKitItems(
      'cycling_v1',
      [{ mode: 'wear', slot: 'base', source: 'wardrobe' }],
      [],
    );
    expect(empty.because).toEqual([]);
  });

  it('distinguishes alpine wear rules from optional pack items', () => {
    const [shell, socks, lighter] = explainKitItems(
      'alpine_v1',
      [
        { mode: 'wear', slot: 'shell', source: 'wardrobe' },
        { mode: 'wear', slot: 'feet', source: 'generic' },
        { mode: 'pack', slot: 'lighter_mid', source: 'generic' },
      ],
      [
        { code: 'UPPER_MOUNTAIN_SETS_KIT' },
        { code: 'HIGH_WIND_AT_UPPER' },
        { code: 'TEMPERATURE_SPREAD' },
        { code: 'LEAVE_WARMER_LAYER_OFF_HILL' },
        { code: 'BOOTS_ARE_EQUIPMENT' },
        { code: 'ELEVATION_UNAVAILABLE' },
        { code: 'WARDROBE_GAP', params: { slot: 'feet' } },
        { code: 'WARDROBE_GAP', params: { slot: 'lighter_mid' } },
      ],
    );

    expect(shell.because).toEqual([
      'UPPER_MOUNTAIN_SETS_KIT',
      'HIGH_WIND_AT_UPPER',
    ]);
    expect(socks.because).toEqual(['UPPER_MOUNTAIN_SETS_KIT', 'WARDROBE_GAP']);
    expect(socks.because).not.toContain('HIGH_WIND_AT_UPPER');
    expect(lighter.because).toEqual(['TEMPERATURE_SPREAD', 'WARDROBE_GAP']);
    expect(lighter.because).not.toContain('UPPER_MOUNTAIN_SETS_KIT');
  });

  it('uses cross-country pack and wear codes only when they were emitted', () => {
    const [packedShell, wornShell] = explainKitItems(
      'xc_v1',
      [
        { mode: 'pack', slot: 'shell', source: 'wardrobe' },
        {
          mode: 'wear',
          slot: 'shell',
          source: 'wardrobe',
          configuration: [{ code: 'VENTS_OPEN' }],
        },
      ],
      [
        { code: 'PACK_SHELL' },
        { code: 'MILD_CONDITIONS' },
        { code: 'VENTS_FOR_CLIMB' },
        { code: 'NO_WAX_ADVICE' },
        { code: 'CLASSIC_BOOTS_ARE_EQUIPMENT' },
      ],
    );

    expect(packedShell.because).toEqual(['PACK_SHELL']);
    expect(wornShell.because).toEqual(['VENTS_FOR_CLIMB']);
  });

  it('explains a real motorcycle kit without inventing rain, elevation, or personal history', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([
        point({ airTempC: -5, windSpeedMs: 8, precipitationProbPct: 5 }),
        point({ airTempC: -5, windSpeedMs: 8, precipitationProbPct: 5 }),
      ]),
      wardrobe: [motorcycleJacket(), motorcyclePants()],
      rideDurationMin: 90,
      cruiseKmh: 70,
      personalColdBiasC: 2,
      personalSampleCount: 0,
    });
    const emitted = codesOf(result.reasons);
    const wear = explainKitItems('motorcycle_v1', result.wear, result.reasons);
    const pack = explainKitItems('motorcycle_v1', result.pack, result.reasons);
    const shell = wear.find((item) => item.slot === 'shell');

    expect(shell).toBeDefined();
    expect(shell?.because).toContain('SUSTAINED_COLD_EXPOSURE');
    expect(shell?.because).toContain('HIGH_WIND_EXPOSURE');
    expect(shell?.because).not.toContain('RAIN_PROTECTION_REQUIRED');
    expect(shell?.because).not.toContain('PACK_RAIN_LAYER');
    for (const item of [...wear, ...pack]) {
      assertSubset(item.because, emitted);
      expect(item.because).not.toContain('ELEVATION_USED');
      if (item.mode === 'wear') {
        expect(item.because).not.toContain('PACK_EXTRA_INSULATION');
        expect(item.because).not.toContain('PACK_RAIN_LAYER');
        expect(item.because).not.toContain('SHORT_COLD_SEGMENT');
      }
    }
    expect(emitted.some((code) => code.startsWith('PERSONAL_'))).toBe(false);
  });

  it('keeps motorcycle, demo, and unshared clothes out of a cycling explanation', () => {
    const prepared = prepareRecommendationWardrobe(
      [
        cyclingGarment({
          id: 'mc-shell',
          name: 'Motorcycle jacket',
          category: 'shell_jacket',
          activityTags: ['motorcycle'],
          isDemo: false,
        }),
        cyclingGarment({
          id: 'demo-alpine',
          name: 'Demo alpine shell',
          category: 'shell_jacket',
          activityTags: ['alpine_skiing'],
          isDemo: true,
        }),
        cyclingGarment({
          id: 'own-alpine',
          name: 'Own alpine shell',
          category: 'shell_jacket',
          activityTags: ['alpine_skiing'],
          isDemo: false,
        }),
        cyclingGarment({
          id: 'demo-cycle',
          name: 'Demo cycling base',
          category: 'base_layer',
          activityTags: ['cycling'],
          isDemo: true,
          primaryBodyZone: 'torso',
        }),
        cyclingGarment({
          id: 'own-cycle',
          name: 'Own cycling shell',
          category: 'shell_jacket',
          activityTags: ['cycling'],
          isDemo: false,
        }),
      ],
      'cycling',
      ['cycling', 'alpine_snowboard'],
    );

    expect(prepared.map((item) => item.id).sort()).toEqual([
      'demo-cycle',
      'own-alpine',
      'own-cycle',
    ]);

    const result = runCyclingRecommendationPipeline({
      weather: weather([
        point({
          airTempC: 2,
          windSpeedMs: 6,
          precipitationProbPct: 80,
          precipitationMm: 2,
        }),
      ]),
      wardrobe: prepared,
      rideDurationMin: 90,
      intensity: 'steady',
      geometryFallback: true,
    });
    const emitted = codesOf(result.reasons);
    const explained = [
      ...explainKitItems('cycling_v1', result.wear, result.reasons),
      ...explainKitItems('cycling_v1', result.pack, result.reasons),
    ];
    const ids = explained.map((item) => item.garmentId).filter(Boolean);

    expect(ids).toContain('demo-cycle');
    expect(ids).not.toContain('mc-shell');
    expect(ids).not.toContain('demo-alpine');
    expect(result.personalization.personalColdBiasC).toBe(0);
    for (const item of explained) {
      assertSubset(item.because, emitted);
      if (item.mode === 'pack') {
        expect(item.because).not.toContain('RAIN_PROTECTION_REQUIRED');
        expect(item.because).not.toContain('SUSTAINED_COLD_EXPOSURE');
      }
    }
    const wornShell = explained.find(
      (item) => item.mode === 'wear' && item.slot === 'shell',
    );
    expect(wornShell?.garmentId === 'mc-shell').toBe(false);
    expect(wornShell?.because).toEqual(
      expect.arrayContaining(['RAIN_PROTECTION_REQUIRED']),
    );
  });

  it('explains snowboard kit from alpine rules and ignores motorcycle clothes', () => {
    const plan = resolveAlpineSites([
      { lat: 61, lon: 8, label: 'Base', elevationM: 1000 },
      { lat: 61.2, lon: 8.2, label: 'Summit', elevationM: 1800 },
    ]);
    const samples = plan.sites
      .filter((site) => site.elevationM != null)
      .map((site) => ({
        role: site.role,
        phase: 'middle' as const,
        estimated: site.estimated,
        weather: point({
          lat: site.lat,
          lon: site.lon,
          airTempC: site.role === 'upper' ? -8 : site.role === 'mid' ? -2 : 3,
          windSpeedMs: site.role === 'upper' ? 11 : 3,
          groundElevationM: site.elevationM ?? undefined,
        }),
      }));
    const result = runAlpineRecommendationPipeline({
      discipline: 'snowboarding',
      durationMin: 180,
      plan,
      samples,
      wardrobe: [
        alpineGarment({
          id: 'mc-suit',
          name: 'Motorcycle suit',
          category: 'one_piece_suit',
          activityTags: ['motorcycle'],
        }),
        alpineGarment({
          id: 'snow-shell',
          name: 'Snowboard shell',
          category: 'shell_jacket',
          activityTags: ['snowboarding'],
        }),
        alpineGarment({
          id: 'cycle-shell',
          name: 'Cycling shell',
          category: 'shell_jacket',
          activityTags: ['cycling'],
        }),
      ],
    });
    const emitted = codesOf(result.reasons);
    const explained = [
      ...explainKitItems('alpine_v1', result.wear, result.reasons),
      ...explainKitItems('alpine_v1', result.pack, result.reasons),
    ];
    const shell = explained.find((item) => item.slot === 'shell');

    expect(shell?.garmentId).toBe('snow-shell');
    expect(shell?.mode).toBe('wear');
    expect(shell?.because).toContain('UPPER_MOUNTAIN_SETS_KIT');
    expect(shell?.because).toContain('HIGH_WIND_AT_UPPER');
    expect(explained.map((item) => item.garmentId)).not.toContain('mc-suit');
    expect(explained.map((item) => item.garmentId)).not.toContain('cycle-shell');
    expect(result.personalization.personalColdBiasC).toBe(0);
    for (const item of explained) {
      assertSubset(item.because, emitted);
      expect(item.because).not.toContain('RAIN_PROTECTION_REQUIRED');
      expect(item.because).not.toContain('BOOTS_ARE_EQUIPMENT');
    }
  });

  it('explains a packed cross-country shell without calling it rain wear', () => {
    const result = runXcRecommendationPipeline({
      weather: weather([point({ airTempC: 8, windSpeedMs: 2 })]),
      wardrobe: [
        xcGarment({
          id: 'xc-shell',
          name: 'XC shell',
          category: 'shell_jacket',
          activityTags: ['xc_skiing'],
        }),
        xcGarment({
          id: 'mc-shell',
          name: 'Motorcycle shell',
          category: 'shell_jacket',
          activityTags: ['motorcycle'],
        }),
      ],
      durationMin: 90,
      durationAssumed: false,
      intensity: 'steady',
      style: 'skate',
    });
    const explained = explainKitItems('xc_v1', result.pack, result.reasons);
    const shell = explained.find((item) => item.slot === 'shell');

    expect(shell?.garmentId).toBe('xc-shell');
    expect(shell?.because).toEqual(['PACK_SHELL']);
    expect(shell?.because).not.toContain('RAIN_PROTECTION_REQUIRED');
    expect(result.personalization.personalColdBiasC).toBe(0);
  });
});

function motorcycleJacket(): GarmentInput {
  return {
    id: 'j1',
    name: 'Textile jacket',
    category: 'shell_jacket',
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: true,
    isHeated: false,
    activityTags: ['motorcycle'],
    components: [
      {
        id: 'liner',
        kind: 'thermal_liner',
        name: 'Thermal',
        warmthDelta: 1,
        windResistDelta: 0,
        waterResistDelta: 0,
        breathabilityDelta: -1,
      },
    ],
  };
}

function motorcyclePants(): GarmentInput {
  return {
    id: 'p1',
    name: 'Textile pants',
    category: 'pants',
    layer: 'outer',
    primaryBodyZone: 'legs',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: false,
    isHeated: false,
    activityTags: ['motorcycle'],
    components: [],
  };
}

function cyclingGarment(
  partial: Partial<CyclingGarmentInput> &
    Pick<CyclingGarmentInput, 'id' | 'name' | 'category' | 'activityTags'> & {
      isDemo?: boolean;
    },
): CyclingGarmentInput & { isDemo?: boolean } {
  return {
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 3,
    waterResistTier: 4,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: false,
    isHeated: false,
    components: [],
    ...partial,
  };
}

function alpineGarment(
  partial: Partial<AlpineGarmentInput> &
    Pick<AlpineGarmentInput, 'id' | 'name' | 'category' | 'activityTags'>,
): AlpineGarmentInput {
  return {
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 4,
    breathabilityTier: 3,
    material: null,
    hasVentilation: false,
    isHeated: false,
    components: [],
    ...partial,
  };
}

function xcGarment(
  partial: Partial<XcGarmentInput> &
    Pick<XcGarmentInput, 'id' | 'name' | 'category' | 'activityTags'>,
): XcGarmentInput {
  return {
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 2,
    windResistTier: 3,
    waterResistTier: 3,
    breathabilityTier: 4,
    material: null,
    hasVentilation: false,
    isHeated: false,
    components: [],
    ...partial,
  };
}
