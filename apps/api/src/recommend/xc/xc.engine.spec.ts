import { xcSampleDurationMin } from './samples';
import { runXcRecommendationPipeline } from './pipeline';
import type { XcGarmentInput, XcPipelineInput } from './types';
import type { WeatherPoint } from '../weather.types';

function point(
  overrides: Partial<WeatherPoint> & { airTempC: number },
): WeatherPoint {
  return {
    lat: 61,
    lon: 10,
    precipitationProbPct: 0,
    precipitationMm: 0,
    windSpeedMs: 3,
    ...overrides,
  };
}

function garment(
  overrides: Partial<XcGarmentInput> &
    Pick<XcGarmentInput, 'id' | 'category' | 'activityTags'>,
): XcGarmentInput {
  return {
    name: overrides.id,
    layer: 'mid',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 3,
    waterResistTier: 2,
    breathabilityTier: 4,
    material: null,
    hasVentilation: false,
    isHeated: false,
    components: [],
    ...overrides,
  };
}

function run(overrides: Partial<XcPipelineInput> = {}) {
  const input: XcPipelineInput = {
    weather: {
      provider: 'met',
      sampledAt: '2026-10-02T08:00:00.000Z',
      points: [point({ airTempC: 8, groundElevationM: 200 })],
      minTempC: 8,
      maxTempC: 8,
      maxRainProbPct: 0,
      maxPrecipMm: 0,
      maxWindMs: 3,
    },
    wardrobe: [],
    durationMin: 120,
    durationAssumed: false,
    intensity: 'steady',
    style: 'classic',
    ...overrides,
  };
  return runXcRecommendationPipeline(input);
}

describe('xc skiing foundation', () => {
  it('shares one engine for classic and skate', () => {
    const points = [
      point({ airTempC: 1, windSpeedMs: 5, groundElevationM: 180 }),
      point({
        airTempC: -2,
        windSpeedMs: 6,
        groundElevationM: 220,
        forecastAt: '2026-10-02T09:00:00.000Z',
      }),
    ];
    const weather = {
      provider: 'met',
      sampledAt: '2026-10-02T08:00:00.000Z',
      points,
      minTempC: -2,
      maxTempC: 1,
      maxRainProbPct: 0,
      maxPrecipMm: 0,
      maxWindMs: 6,
    };
    const classic = run({ weather, style: 'classic', intensity: 'hard' });
    const skate = run({ weather, style: 'skate', intensity: 'hard' });

    expect(classic.engine).toBe('xc_v1');
    expect(skate.engine).toBe('xc_v1');
    expect(classic.exposure).toEqual(skate.exposure);
    expect(classic.wear.map((item) => item.slot)).toEqual(
      skate.wear.map((item) => item.slot),
    );
    expect(classic.pack.map((item) => item.slot)).toEqual(
      skate.pack.map((item) => item.slot),
    );
    expect(classic.reasons.map((reason) => reason.code)).toContain(
      'CLASSIC_BOOTS_ARE_EQUIPMENT',
    );
    expect(skate.reasons.map((reason) => reason.code)).toContain(
      'SKATE_BOOTS_ARE_EQUIPMENT',
    );
    expect(classic.reasons.map((reason) => reason.code)).not.toContain(
      'SKATE_BOOTS_ARE_EQUIPMENT',
    );
    expect(JSON.stringify(classic.exposure)).not.toContain('expectedSpeed');
    expect(JSON.stringify(classic.exposure)).not.toContain('motorcycle');
  });

  it('does not invent a style, and an unknown style stays a tag-less run', () => {
    const missing = run({ style: null });
    const unknown = run({ style: 'touring' });
    expect(missing.style).toBeNull();
    expect(unknown.style).toBeNull();
    expect(missing.engine).toBe(unknown.engine);
    expect(missing.exposure).toEqual(unknown.exposure);
    expect(missing.reasons.map((reason) => reason.code)).toContain(
      'STYLE_NOT_SPECIFIED',
    );
  });

  it('raises exposure for a harder effort and for a climb', () => {
    const easy = run({
      intensity: 'easy',
      weather: {
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [point({ airTempC: 0, windSpeedMs: 0, groundElevationM: 100 })],
        minTempC: 0,
        maxTempC: 0,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 0,
      },
    });
    const hard = run({
      intensity: 'hard',
      weather: easy.exposure
        ? {
            provider: 'met',
            sampledAt: '2026-10-02T08:00:00.000Z',
            points: [
              point({ airTempC: 0, windSpeedMs: 0, groundElevationM: 100 }),
            ],
            minTempC: 0,
            maxTempC: 0,
            maxRainProbPct: 0,
            maxPrecipMm: 0,
            maxWindMs: 0,
          }
        : undefined,
    });
    expect(hard.exposure.xcExposureSustainedC).toBeGreaterThan(
      easy.exposure.xcExposureSustainedC,
    );

    const climb = run({
      sampleDurationMin: [60, 60],
      weather: {
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [
          point({ airTempC: 0, windSpeedMs: 0, groundElevationM: 200 }),
          point({ airTempC: 0, windSpeedMs: 0, groundElevationM: 240 }),
        ],
        minTempC: 0,
        maxTempC: 0,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 0,
      },
    });
    const descent = run({
      sampleDurationMin: [60, 60],
      weather: {
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [
          point({ airTempC: 0, windSpeedMs: 0, groundElevationM: 240 }),
          point({ airTempC: 0, windSpeedMs: 0, groundElevationM: 200 }),
        ],
        minTempC: 0,
        maxTempC: 0,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 0,
      },
    });
    expect(climb.exposure.segments[1].climbing).toBe(true);
    expect(descent.exposure.segments[1].climbing).toBe(false);
    expect(climb.exposure.segments[1].exposureC).toBeGreaterThan(
      descent.exposure.segments[1].exposureC,
    );
    expect(climb.reasons.map((reason) => reason.code)).toContain(
      'CLIMB_REDUCES_WORN_DEMAND',
    );
  });

  it('packs a short cold sample instead of dressing the whole tour for it', () => {
    const result = run({
      intensity: 'steady',
      style: 'skate',
      durationMin: 168,
      sampleDurationMin: [80, 80, 8],
      wardrobe: [
        garment({
          id: 'alpine-pants',
          name: 'Insulated alpine pants',
          category: 'pants',
          activityTags: ['alpine_skiing'],
          warmthTier: 5,
        }),
        garment({
          id: 'xc-tights',
          name: 'Race tights',
          category: 'pants',
          activityTags: ['xc_skiing'],
          warmthTier: 2,
        }),
        garment({
          id: 'skate-boots',
          name: 'Skate boots',
          category: 'boots',
          activityTags: ['xc_skiing'],
          warmthTier: 4,
        }),
      ],
      weather: {
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [
          point({ airTempC: 8, windSpeedMs: 3, groundElevationM: 200 }),
          point({ airTempC: 8, windSpeedMs: 3, groundElevationM: 230 }),
          point({ airTempC: -12, windSpeedMs: 8, groundElevationM: 230 }),
        ],
        minTempC: -12,
        maxTempC: 8,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 8,
      },
    });

    expect(result.exposure.segments[2].isShortExtreme).toBe(true);
    expect(result.demand.shortExtremeInfluencesPackOnly).toBe(true);
    expect(result.demand.sustainedWarmth).toBeLessThan(
      result.demand.peakWarmth,
    );
    expect(result.wear.map((item) => item.slot)).not.toContain('mid');
    expect(result.pack.map((item) => item.slot)).toEqual(
      expect.arrayContaining(['mid', 'shell', 'overmitts']),
    );
    expect(result.wear.find((item) => item.slot === 'shell')).toBeUndefined();
    expect(result.wear.find((item) => item.slot === 'legs')?.garmentId).toBe(
      'xc-tights',
    );
    expect(result.wear.map((item) => item.garmentId)).not.toContain(
      'alpine-pants',
    );
    expect(result.pack.map((item) => item.garmentId)).not.toContain(
      'alpine-pants',
    );
    expect(
      [...result.wear, ...result.pack].map((item) => item.category),
    ).not.toContain('boots');
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'SHORT_COLD_STOP_PACKED',
    );
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'NO_GROOMING_STATUS',
    );
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'NO_WAX_ADVICE',
    );
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'USER_TRACK_NOT_ROAD',
    );
  });

  it('does not treat a missing height as a neighbour height or as a climb', () => {
    const result = run({
      sampleDurationMin: [40, 40, 40],
      weather: {
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [
          point({ airTempC: 0, windSpeedMs: 1, groundElevationM: 100 }),
          point({ airTempC: 0, windSpeedMs: 1 }),
          point({ airTempC: 0, windSpeedMs: 1, groundElevationM: 140 }),
        ],
        minTempC: 0,
        maxTempC: 0,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 1,
      },
    });
    expect(result.exposure.segments[1].groundElevationM).toBeNull();
    expect(result.exposure.segments[1].climbing).toBe(false);
    expect(result.exposure.segments[2].climbing).toBe(false);
    expect(result.elevation).toBe('partial');
  });

  it('wears the shell when rain is sustained, and keeps a mild shell in the pack', () => {
    const wet = run({
      weather: {
        provider: 'met',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [
          point({
            airTempC: 4,
            windSpeedMs: 3,
            precipitationProbPct: 80,
            precipitationMm: 1,
            groundElevationM: 150,
          }),
        ],
        minTempC: 4,
        maxTempC: 4,
        maxRainProbPct: 80,
        maxPrecipMm: 1,
        maxWindMs: 3,
      },
    });
    expect(wet.wear.map((item) => item.slot)).toContain('shell');
    expect(wet.reasons.map((reason) => reason.code)).toContain(
      'RAIN_PROTECTION_REQUIRED',
    );

    const mild = run({ intensity: 'hard' });
    expect(mild.pack.map((item) => item.slot)).toContain('shell');
    expect(mild.wear.map((item) => item.slot)).not.toContain('shell');
    expect(mild.reasons.map((reason) => reason.code)).toContain('PACK_SHELL');
  });

  it('flags an empty line and does not claim personal evidence', () => {
    const result = run({
      durationAssumed: true,
      intensity: undefined,
      wardrobe: [],
      weather: {
        provider: 'none',
        sampledAt: '2026-10-02T08:00:00.000Z',
        points: [],
        minTempC: 0,
        maxTempC: 0,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 0,
      },
    });
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'INCOMPLETE_WEATHER',
        'ASSUMED_INTENSITY',
        'ASSUMED_DURATION',
        'GENERIC_XC_KIT',
        'ELEVATION_UNAVAILABLE',
        'BASELINE_NO_PERSONAL_EVIDENCE',
      ]),
    );
    expect(result.personalization.canClaimPersonal).toBe(false);
    expect(result.personalization.personalColdBiasC).toBe(0);
    expect(result.line).toBe('user_waypoints');
  });

  it('splits tour minutes along the line without inventing equal time for a short leg', () => {
    expect(
      xcSampleDurationMin([0, 0.5, 1], 90).reduce((sum, n) => sum + n, 0),
    ).toBe(90);
    const skewed = xcSampleDurationMin([0, 0.9, 1], 100);
    expect(skewed.reduce((sum, n) => sum + n, 0)).toBe(100);
    expect(skewed[2]).toBeLessThan(skewed[0]);
    expect(skewed[2]).toBeLessThanOrEqual(15);
  });
});
