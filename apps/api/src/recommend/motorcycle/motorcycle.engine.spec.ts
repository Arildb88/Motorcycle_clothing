import {
  buildRideSegments,
  computeConfidence,
  computeDemand,
  matchWardrobe,
  motorcycleExposureC,
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

function weather(
  points: WeatherPoint[],
  extras: Partial<RouteWeatherSummary> = {},
): RouteWeatherSummary {
  const temps = points.map((p) => p.airTempC);
  return {
    provider: 'mock',
    sampledAt: new Date().toISOString(),
    points,
    minTempC: Math.min(...temps),
    maxTempC: Math.max(...temps),
    maxRainProbPct: Math.max(...points.map((p) => p.precipitationProbPct)),
    maxPrecipMm: Math.max(...points.map((p) => p.precipitationMm)),
    maxWindMs: Math.max(...points.map((p) => p.windSpeedMs)),
    ...extras,
  };
}

function jacket(overrides: Partial<GarmentInput> = {}): GarmentInput {
  return {
    id: 'j1',
    name: 'Klim Adventure',
    category: 'shell_jacket',
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 2,
    windResistTier: 5,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: true,
    isHeated: false,
    activityTags: ['motorcycle'],
    components: [
      {
        id: 'thermal-1',
        kind: 'thermal_liner',
        name: 'Thermal liner',
        warmthDelta: 2,
        windResistDelta: 0,
        waterResistDelta: 0,
        breathabilityDelta: -1,
      },
      {
        id: 'wp-1',
        kind: 'waterproof_liner',
        name: 'Waterproof liner',
        warmthDelta: 0,
        windResistDelta: 0,
        waterResistDelta: 2,
        breathabilityDelta: -1,
      },
    ],
    ...overrides,
  };
}

function pants(): GarmentInput {
  return {
    id: 'p1',
    name: 'Touring pants',
    category: 'pants',
    layer: 'outer',
    primaryBodyZone: 'legs',
    warmthTier: 2,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: true,
    isHeated: false,
    activityTags: ['motorcycle'],
    components: [],
  };
}

function gloves(warmth = 3): GarmentInput {
  return {
    id: 'g1',
    name: 'Winter gloves',
    category: 'gloves',
    layer: 'accessory',
    primaryBodyZone: 'hands',
    warmthTier: warmth,
    windResistTier: 4,
    waterResistTier: 4,
    breathabilityTier: 2,
    material: 'textile',
    hasVentilation: false,
    isHeated: false,
    activityTags: ['motorcycle'],
    components: [],
  };
}

describe('motorcycle exposure', () => {
  it('F: higher motorcycle exposure increases cooling vs low wind/speed', () => {
    const calm = motorcycleExposureC(point({ airTempC: 10, windSpeedMs: 1 }), {
      cruiseKmh: 40,
    });
    const exposed = motorcycleExposureC(
      point({ airTempC: 10, windSpeedMs: 12 }),
      { cruiseKmh: 100 },
    );
    expect(exposed).toBeLessThan(calm);
  });
});

describe('duration weighting', () => {
  it('O: short extreme does not equal long extreme for sustained demand', () => {
    const shortCold = weather([
      point({ airTempC: 18 }),
      point({ airTempC: 18 }),
      point({ airTempC: -5, windSpeedMs: 8 }),
    ]);
    const longCold = weather([
      point({ airTempC: -5, windSpeedMs: 8 }),
      point({ airTempC: -5, windSpeedMs: 8 }),
      point({ airTempC: -5, windSpeedMs: 8 }),
    ]);
    const shortSegs = buildRideSegments({
      weather: shortCold,
      rideDurationMin: 120,
      cruiseKmh: 70,
    });
    const longSegs = buildRideSegments({
      weather: longCold,
      rideDurationMin: 120,
      cruiseKmh: 70,
    });
    const shortDemand = computeDemand(shortSegs).demand;
    const longDemand = computeDemand(longSegs).demand;
    expect(shortDemand.sustainedWarmth).toBeLessThan(longDemand.sustainedWarmth);
    expect(shortDemand.peakWarmth).toBeGreaterThanOrEqual(
      shortDemand.sustainedWarmth,
    );
  });

  it('C: short cold segment flags pack-only influence', () => {
    const w = weather([
      point({ airTempC: 16, windSpeedMs: 2 }),
      point({ airTempC: 16, windSpeedMs: 2 }),
      point({ airTempC: 16, windSpeedMs: 2 }),
      point({ airTempC: 16, windSpeedMs: 2 }),
      point({ airTempC: 16, windSpeedMs: 2 }),
      point({ airTempC: -8, windSpeedMs: 10 }),
    ]);
    const segs = buildRideSegments({
      weather: w,
      rideDurationMin: 180,
      cruiseKmh: 70,
    });
    const { demand, reasons } = computeDemand(segs);
    expect(demand.shortExtremeInfluencesPackOnly).toBe(true);
    expect(reasons.some((r) => r.code === 'SHORT_COLD_SEGMENT')).toBe(true);
    expect(demand.sustainedWarmth).toBeLessThan(demand.peakWarmth);
  });
});

describe('pipeline acceptance', () => {
  it('A: mild dry ride avoids unnecessary insulation', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 20, windSpeedMs: 2 })]),
      wardrobe: [jacket(), pants(), gloves(5)],
      rideDurationMin: 45,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    expect(result.demand.sustainedWarmth).toBeLessThanOrEqual(2);
    expect(result.wear.some((i) => i.slot === 'mid')).toBe(false);
    expect(result.wear.some((i) => i.slot === 'base')).toBe(false);
    expect(
      result.wear.some(
        (i) =>
          i.configuration.some((c) => c.code === 'INSTALL_THERMAL_LINER'),
      ),
    ).toBe(false);
    expect(result.reasons.some((r) => r.code === 'MILD_CONDITIONS')).toBe(true);
  });

  it('B: sustained cold increases warmth and uses owned layers/config', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([
        point({ airTempC: 0, windSpeedMs: 8 }),
        point({ airTempC: -2, windSpeedMs: 8 }),
      ]),
      wardrobe: [jacket(), pants(), gloves(5)],
      rideDurationMin: 120,
      cruiseKmh: 80,
      personalSampleCount: 0,
    });
    expect(result.demand.sustainedWarmth).toBeGreaterThanOrEqual(3);
    const shell = result.wear.find((i) => i.slot === 'shell');
    expect(shell?.source).toBe('wardrobe');
    expect(shell?.garmentId).toBe('j1');
    expect(
      shell?.configuration.some((c) => c.code === 'INSTALL_THERMAL_LINER'),
    ).toBe(true);
    expect(result.reasons.some((r) => r.code === 'SUSTAINED_COLD_EXPOSURE')).toBe(
      true,
    );
  });

  it('C/K: short cold → pack insulation, structured wear vs pack', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([
        point({ airTempC: 16 }),
        point({ airTempC: 16 }),
        point({ airTempC: 16 }),
        point({ airTempC: 16 }),
        point({ airTempC: 16 }),
        point({ airTempC: -10, windSpeedMs: 12 }),
      ]),
      wardrobe: [jacket(), pants(), gloves(4)],
      rideDurationMin: 180,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    expect(Array.isArray(result.wear)).toBe(true);
    expect(Array.isArray(result.pack)).toBe(true);
    expect(result.demand.shortExtremeInfluencesPackOnly).toBe(true);
    expect(result.pack.length).toBeGreaterThan(0);
    expect(result.wear.every((i) => i.mode === 'wear')).toBe(true);
    expect(result.pack.every((i) => i.mode === 'pack')).toBe(true);
  });

  it('D: sustained rain raises waterproof demand and prefers owned waterproof', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([
        point({
          airTempC: 12,
          precipitationMm: 2,
          precipitationProbPct: 80,
        }),
        point({
          airTempC: 11,
          precipitationMm: 1.5,
          precipitationProbPct: 75,
        }),
      ]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 90,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    const torsoWater =
      result.demand.sustained.find((z) => z.zone === 'torso')?.water ?? 0;
    expect(torsoWater).toBeGreaterThanOrEqual(3);
    expect(
      result.reasons.some((r) => r.code === 'RAIN_PROTECTION_REQUIRED'),
    ).toBe(true);
    const rainOrShell = [...result.wear, ...result.pack].find(
      (i) => i.slot === 'rain' || i.slot === 'shell',
    );
    expect(rainOrShell?.source).toBe('wardrobe');
  });

  it('E: short/later rain → PACK waterproof rather than WEAR when justified', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([
        point({ airTempC: 16, precipitationMm: 0, precipitationProbPct: 5 }),
        point({ airTempC: 16, precipitationMm: 0, precipitationProbPct: 5 }),
        point({ airTempC: 16, precipitationMm: 0, precipitationProbPct: 5 }),
        point({ airTempC: 16, precipitationMm: 0, precipitationProbPct: 5 }),
        point({
          airTempC: 14,
          precipitationMm: 1.2,
          precipitationProbPct: 70,
        }),
      ]),
      wardrobe: [
        jacket({ waterResistTier: 2 }),
        pants(),
        {
          id: 'rain1',
          name: 'Rain suit',
          category: 'rain_layer',
          layer: 'outer',
          primaryBodyZone: 'full_body',
          warmthTier: 1,
          windResistTier: 4,
          waterResistTier: 5,
          breathabilityTier: 2,
          material: 'textile',
          hasVentilation: false,
          isHeated: false,
          activityTags: ['motorcycle'],
          components: [],
        },
      ],
      rideDurationMin: 150,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    const wearRain = result.wear.filter((i) => i.slot === 'rain');
    const packRain = result.pack.filter((i) => i.slot === 'rain');
    // Sustained water should be below wear threshold while peak triggers pack.
    const sustainedWater =
      result.demand.sustained.find((z) => z.zone === 'torso')?.water ?? 0;
    if (sustainedWater < 3) {
      expect(wearRain.length).toBe(0);
      expect(packRain.length).toBeGreaterThan(0);
    }
    expect(
      result.reasons.some(
        (r) => r.code === 'PACK_RAIN_LAYER' || r.code === 'RAIN_PROTECTION_REQUIRED',
      ),
    ).toBe(true);
  });

  it('G: liner recommended as same physical garment with config instruction', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: -2, windSpeedMs: 10 })]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 60,
      cruiseKmh: 80,
      personalSampleCount: 0,
    });
    const shellItems = result.wear.filter((i) => i.slot === 'shell');
    expect(shellItems).toHaveLength(1);
    expect(shellItems[0].garmentId).toBe('j1');
    expect(
      shellItems[0].configuration.some((c) => c.code === 'INSTALL_THERMAL_LINER'),
    ).toBe(true);
    expect(result.reasons.some((r) => r.code === 'THERMAL_LINER_RECOMMENDED')).toBe(
      true,
    );
  });

  it('H: cold prefers closed vents; warm may open vents', () => {
    const cold = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 2, windSpeedMs: 8 })]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 60,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    const warm = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 24, windSpeedMs: 2 })]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 40,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    const coldShell = cold.wear.find((i) => i.slot === 'shell');
    expect(
      coldShell?.configuration.some((c) => c.code === 'VENTS_CLOSED'),
    ).toBe(true);
    const warmShell = warm.wear.find((i) => i.slot === 'shell');
    expect(
      warmShell?.configuration.some((c) => c.code === 'VENTS_OPEN'),
    ).toBe(true);
  });

  it('I: prefers owned wardrobe over generic when suitable gear exists', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 8, windSpeedMs: 6 })]),
      wardrobe: [jacket(), pants(), gloves(4)],
      rideDurationMin: 50,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    expect(result.wear.some((i) => i.source === 'wardrobe')).toBe(true);
    const hands = result.wear.find((i) => i.slot === 'hands');
    expect(hands?.source).toBe('wardrobe');
    expect(hands?.garmentName).toBe('Winter gloves');
  });

  it('J: wardrobe gap returns generic requirement marked not owned', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 0, windSpeedMs: 8 })]),
      wardrobe: [jacket(), pants()], // no gloves
      rideDurationMin: 60,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    const hands = result.wear.find((i) => i.slot === 'hands');
    expect(hands?.source).toBe('generic');
    expect(hands?.genericLabel).toMatch(/gloves/i);
    expect(result.reasons.some((r) => r.code === 'WARDROBE_GAP')).toBe(true);
  });

  it('L: engine returns language-neutral reason codes', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 0, windSpeedMs: 10 })]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 60,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    for (const r of result.reasons) {
      expect(r.code).toMatch(/^[A-Z0-9_]+$/);
      expect(r.code).not.toMatch(/[æøå]/i);
      expect(typeof r.code).toBe('string');
    }
  });

  it('M: incomplete input yields lower confidence than rich input', () => {
    const low = computeConfidence({
      weather: weather([]),
      wardrobe: [],
      cruiseKmhKnown: false,
      sampleCount: 0,
    });
    const high = computeConfidence({
      weather: weather([
        point(),
        point({ airTempC: 17 }),
        point({ airTempC: 16 }),
      ]),
      wardrobe: [jacket(), pants(), gloves()],
      cruiseKmhKnown: true,
      sampleCount: 5,
    });
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    expect(rank[low.level]).toBeLessThan(rank[high.level]);
  });

  it('N: new user gets baseline without personalized claims', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 5 })]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 40,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    expect(result.personalization.voice).toBe('baseline');
    expect(result.personalization.canClaimPersonal).toBe(false);
    expect(result.personalization.personalWeight).toBe(0);
    expect(
      result.reasons.some((r) => r.code === 'BASELINE_NO_PERSONAL_EVIDENCE'),
    ).toBe(true);
    expect(
      result.reasons.every(
        (r) => !String(r.code).startsWith('PERSONAL_') || r.code === 'BASELINE_NO_PERSONAL_EVIDENCE',
      ),
    ).toBe(true);
  });

  it('K: wear vs pack are first-class structured fields', () => {
    const result = runMotorcycleRecommendationPipeline({
      weather: weather([point({ airTempC: 10 })]),
      wardrobe: [jacket(), pants()],
      rideDurationMin: 30,
      cruiseKmh: 70,
      personalSampleCount: 0,
    });
    expect(result).toHaveProperty('wear');
    expect(result).toHaveProperty('pack');
    expect(result.engine).toBe('motorcycle_v1');
    expect(result.confidence.level).toMatch(/LOW|MEDIUM|HIGH/);
  });
});

describe('matchWardrobe helpers', () => {
  it('does not invent owned products on gap', () => {
    const segs = buildRideSegments({
      weather: weather([point({ airTempC: 0, windSpeedMs: 8 })]),
      rideDurationMin: 60,
      cruiseKmh: 70,
    });
    const { demand } = computeDemand(segs);
    const { wear } = matchWardrobe({
      demand,
      wardrobe: [],
      sustainedExposureC: -2,
      packWarmth: false,
      packRain: false,
    });
    expect(wear.every((i) => i.source === 'generic')).toBe(true);
    expect(wear.every((i) => !i.garmentId)).toBe(true);
  });
});
