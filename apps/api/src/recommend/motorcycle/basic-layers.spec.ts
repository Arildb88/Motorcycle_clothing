import { explainKitItems } from '../explain-kit';
import {
  BASIC_LOWER_WARMTH,
  BASIC_UPPER_WARMTH,
  InvalidBasicLayerError,
  basicLayerWarmth,
  parseBasicLayers,
} from './basic-layers';
import {
  runMotorcycleRecommendationPipeline,
  type GarmentInput,
} from './index';
import type { RouteWeatherSummary, WeatherPoint } from '../weather.types';

function point(overrides: Partial<WeatherPoint> = {}): WeatherPoint {
  return {
    lat: 59.9,
    lon: 10.7,
    airTempC: 18,
    precipitationProbPct: 5,
    precipitationMm: 0,
    windSpeedMs: 2,
    ...overrides,
  };
}

function weather(points: WeatherPoint[]): RouteWeatherSummary {
  const temps = points.map((item) => item.airTempC);
  return {
    provider: 'mock',
    sampledAt: '2026-10-06T08:00:00.000Z',
    points,
    minTempC: Math.min(...temps),
    maxTempC: Math.max(...temps),
    maxRainProbPct: Math.max(
      ...points.map((item) => item.precipitationProbPct),
    ),
    maxPrecipMm: Math.max(...points.map((item) => item.precipitationMm)),
    maxWindMs: Math.max(...points.map((item) => item.windSpeedMs)),
  };
}

function garment(overrides: Partial<GarmentInput>): GarmentInput {
  return {
    id: 'g',
    name: 'Garment',
    category: 'base_layer',
    layer: 'base',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 1,
    waterResistTier: 1,
    breathabilityTier: 4,
    material: null,
    hasVentilation: false,
    isHeated: false,
    activityTags: ['motorcycle'],
    components: [],
    ...overrides,
  };
}

const cold = weather([
  point({ airTempC: 0, windSpeedMs: 8 }),
  point({ airTempC: -2, windSpeedMs: 8 }),
]);

function recommend(
  basicUpper?: string,
  basicLower?: string,
  wardrobe?: GarmentInput[],
) {
  return runMotorcycleRecommendationPipeline({
    weather: cold,
    wardrobe: wardrobe ?? [
      garment({
        id: 'shell',
        name: 'Textile jacket',
        category: 'shell_jacket',
        layer: 'outer',
        warmthTier: 2,
        windResistTier: 5,
        waterResistTier: 3,
      }),
      garment({
        id: 'pants',
        name: 'Kevlar riding jeans',
        category: 'pants',
        layer: 'outer',
        primaryBodyZone: 'legs',
        warmthTier: 4,
        windResistTier: 4,
        waterResistTier: 3,
      }),
      garment({
        id: 'light-pants',
        name: 'Light riding pants',
        category: 'pants',
        layer: 'outer',
        primaryBodyZone: 'legs',
        warmthTier: 1,
        windResistTier: 4,
        waterResistTier: 2,
      }),
      garment({
        id: 'base',
        name: 'Thermal base',
        category: 'base_layer',
        warmthTier: 3,
      }),
      garment({
        id: 'mid',
        name: 'Fleece mid',
        category: 'mid_layer',
        layer: 'mid',
        warmthTier: 3,
      }),
    ],
    rideDurationMin: 120,
    cruiseKmh: 80,
    personalSampleCount: 0,
    basicLayers: parseBasicLayers(basicUpper, basicLower),
  });
}

function slots<T extends { slot: string }>(items: T[], slot: string): T[] {
  return items.filter((item) => item.slot === slot);
}

describe('motorcycle basic under-layers', () => {
  it('orders warmth without claiming laboratory CLO values', () => {
    expect(BASIC_UPPER_WARMTH.thick_sweater).toBeGreaterThan(
      BASIC_UPPER_WARMTH.thin_sweater,
    );
    expect(BASIC_UPPER_WARMTH.wool_base_top).toBeGreaterThan(
      BASIC_UPPER_WARMTH.t_shirt,
    );
    expect(BASIC_UPPER_WARMTH.thin_sweater).toBeGreaterThan(
      BASIC_UPPER_WARMTH.t_shirt,
    );
    expect(BASIC_LOWER_WARMTH.joggers).toBeGreaterThan(
      BASIC_LOWER_WARMTH.jeans,
    );
    expect(BASIC_LOWER_WARMTH.wool_base_bottom).toBeGreaterThan(
      BASIC_LOWER_WARMTH.jeans,
    );
    for (const value of [
      ...Object.values(BASIC_UPPER_WARMTH),
      ...Object.values(BASIC_LOWER_WARMTH),
    ]) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it('keeps upper credit on the torso and lower credit on the legs', () => {
    expect(
      basicLayerWarmth(parseBasicLayers('thick_sweater', undefined)),
    ).toEqual({ torso: 3, legs: 0 });
    expect(basicLayerWarmth(parseBasicLayers(undefined, 'jeans'))).toEqual({
      torso: 0,
      legs: 1,
    });
    expect(
      basicLayerWarmth(
        parseBasicLayers('t_shirt,thick_sweater', 'wool_base_bottom,jeans'),
      ),
    ).toEqual({ torso: 4, legs: 3 });
    expect(
      basicLayerWarmth(
        parseBasicLayers(
          'wool_base_top,thick_sweater',
          'wool_base_bottom,joggers',
        ),
      ).torso,
    ).toBeLessThanOrEqual(5);
  });

  it('accepts explicit none and does not stack the same role twice', () => {
    expect(parseBasicLayers(undefined, undefined)).toEqual({
      upper: [],
      lower: [],
    });
    expect(parseBasicLayers('', 'none')).toEqual({ upper: [], lower: [] });
    expect(parseBasicLayers(' NONE ', '  ')).toEqual({ upper: [], lower: [] });
    expect(
      parseBasicLayers('thin_sweater,thick_sweater', 'jeans,joggers'),
    ).toEqual({
      upper: ['thick_sweater'],
      lower: ['joggers'],
    });
    expect(
      basicLayerWarmth(parseBasicLayers('thin_sweater,thick_sweater', null)),
    ).toEqual({ torso: BASIC_UPPER_WARMTH.thick_sweater, legs: 0 });
    expect(parseBasicLayers('t_shirt,wool_base_top', 'none')).toEqual({
      upper: ['wool_base_top'],
      lower: [],
    });
    expect(() => parseBasicLayers('ordinary_trousers', 'none')).toThrow(
      InvalidBasicLayerError,
    );
  });

  it('drops extra base and mid layers when a thick sweater already covers them', () => {
    const plain = recommend();
    const covered = recommend('thick_sweater');
    expect(plain.demand.sustainedWarmth).toBeGreaterThanOrEqual(3);
    expect(
      slots(plain.wear, 'base').length + slots(plain.wear, 'mid').length,
    ).toBeGreaterThan(0);
    expect(slots(covered.wear, 'base')).toHaveLength(0);
    expect(slots(covered.wear, 'mid')).toHaveLength(0);
    expect(slots(covered.pack, 'base')).toHaveLength(0);
    expect(slots(covered.pack, 'mid')).toHaveLength(0);
    expect(slots(covered.wear, 'shell')[0]?.garmentId).toBe('shell');
    expect(covered.reasons.map((reason) => reason.code)).toContain(
      'BASIC_UNDERLAYER_WARMTH',
    );
    const explained = explainKitItems(
      covered.engine,
      covered.wear,
      covered.reasons,
    );
    expect(
      explained.find((item) => item.slot === 'shell')?.because ?? [],
    ).not.toContain('BASIC_UNDERLAYER_WARMTH');
  });

  it('does not let basic jeans or a T-shirt replace protective motorcycle gear', () => {
    const bare = recommend(undefined, undefined, [
      garment({
        id: 'tee',
        name: 'Cotton T-shirt',
        category: 'base_layer',
        warmthTier: 1,
      }),
    ]);
    const withBasics = recommend('t_shirt', 'jeans', [
      garment({
        id: 'tee',
        name: 'Cotton T-shirt',
        category: 'base_layer',
        warmthTier: 1,
      }),
    ]);
    for (const result of [bare, withBasics]) {
      const shell = slots(result.wear, 'shell')[0];
      const legs = slots(result.wear, 'legs')[0];
      expect(shell?.source).toBe('generic');
      expect(shell?.genericLabel).toContain('motorcycle jacket');
      expect(shell?.garmentId).toBeUndefined();
      expect(legs?.source).toBe('generic');
      expect(legs?.genericLabel).toContain('motorcycle pants');
      expect(legs?.garmentName).toBeUndefined();
    }

    const ridingJeans = recommend(undefined, 'none');
    expect(slots(ridingJeans.wear, 'legs')[0]?.garmentId).toBeDefined();
    expect(slots(ridingJeans.wear, 'legs')[0]?.category).toBe('pants');
    const stillProtected = recommend(undefined, 'jeans');
    expect(slots(stillProtected.wear, 'legs')).toHaveLength(1);
    expect(slots(stillProtected.wear, 'legs')[0]?.category).toBe('pants');
    expect(slots(stillProtected.wear, 'shell')[0]?.garmentId).toBe(
      slots(ridingJeans.wear, 'shell')[0]?.garmentId,
    );
    expect(stillProtected.basicLayers).toEqual({
      upper: [],
      lower: ['jeans'],
      torsoWarmth: 0,
      legsWarmth: 1,
    });
    expect(stillProtected.reasons.map((reason) => reason.code)).not.toContain(
      'BASIC_UNDERLAYER_WARMTH',
    );
  });

  it('lets leg credit change the protective pant without touching the torso layers', () => {
    const plain = recommend();
    const layered = recommend(undefined, 'wool_base_bottom,joggers');
    expect(slots(layered.wear, 'base').map((item) => item.garmentId)).toEqual(
      slots(plain.wear, 'base').map((item) => item.garmentId),
    );
    expect(slots(layered.wear, 'mid').map((item) => item.garmentId)).toEqual(
      slots(plain.wear, 'mid').map((item) => item.garmentId),
    );
    expect(slots(layered.wear, 'legs')[0]?.category).toBe('pants');
    expect(slots(layered.wear, 'legs')[0]?.garmentId).toBe('light-pants');
    expect(slots(plain.wear, 'legs')[0]?.garmentId).not.toBe('light-pants');
  });
});
