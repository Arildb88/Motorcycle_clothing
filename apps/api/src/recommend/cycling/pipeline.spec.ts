import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { cyclingApparentAirflow } from './airflow';
import {
  parseCyclingIntensity,
  runCyclingRecommendationPipeline,
  type CyclingPipelineInput,
} from './index';
import type { CyclingGarmentInput } from './types';
import type { RouteWeatherSummary, WeatherPoint } from '../weather.types';

function point(overrides: Partial<WeatherPoint> = {}): WeatherPoint {
  return {
    lat: 59.91,
    lon: 10.75,
    airTempC: 18,
    precipitationProbPct: 0,
    precipitationMm: 0,
    windSpeedMs: 2,
    ...overrides,
  };
}

function weather(points: WeatherPoint[]): RouteWeatherSummary {
  const temps = points.map((item) => item.airTempC);
  return {
    provider: 'mock',
    sampledAt: '2026-10-02T12:00:00.000Z',
    points,
    minTempC: temps.length ? Math.min(...temps) : 0,
    maxTempC: temps.length ? Math.max(...temps) : 0,
    maxRainProbPct: points.reduce(
      (max, item) => Math.max(max, item.precipitationProbPct),
      0,
    ),
    maxPrecipMm: points.reduce(
      (max, item) => Math.max(max, item.precipitationMm),
      0,
    ),
    maxWindMs: points.reduce((max, item) => Math.max(max, item.windSpeedMs), 0),
  };
}

function garment(
  overrides: Partial<CyclingGarmentInput> & Pick<CyclingGarmentInput, 'name' | 'category'>,
): CyclingGarmentInput {
  return {
    id: overrides.name,
    primaryBodyZone: 'torso',
    warmthTier: 2,
    activityTags: ['cycling'],
    ...overrides,
  };
}

function run(
  overrides: Partial<CyclingPipelineInput> & { points?: WeatherPoint[] } = {},
) {
  const points = overrides.points ?? [point(), point({ lat: 59.92 }), point({ lat: 59.93 })];
  return runCyclingRecommendationPipeline({
    weather: weather(points),
    wardrobe: [],
    intensity: 'steady',
    coldSensitivity: 0,
    rideDurationMin: 90,
    routeDistanceM: null,
    usedCyclingGeometry: false,
    ...overrides,
  });
}

function codes(result: { reasons: Array<{ code: string }> }): string[] {
  return result.reasons.map((reason) => reason.code);
}

describe('cycling recommendation pipeline', () => {
  it('does not import the motorcycle engine', () => {
    const files = readdirSync(__dirname).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
    );
    for (const file of files) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      expect(source).not.toContain('recommend/motorcycle');
      expect(source).not.toContain('motorcycleExposure');
      expect(source).not.toContain('defaultCruiseKmh');
    }
  });

  it('parses only the three authorized intensities', () => {
    expect(parseCyclingIntensity('easy')).toBe('easy');
    expect(parseCyclingIntensity(' HARD ')).toBe('hard');
    expect(parseCyclingIntensity('race')).toBeNull();
    expect(parseCyclingIntensity(undefined)).toBeNull();
  });

  it('uses a cycling style speed when geometry is missing, not a motorcycle cruise', () => {
    const easy = run({ intensity: 'easy' });
    expect(easy.exposure.speedSource).toBe('assumed_style');
    expect(easy.exposure.durationWeightedSpeedKmh).toBe(16);
    expect(easy.reasons.map((reason) => reason.code)).toContain(
      'CYCLING_WAYPOINT_FALLBACK',
    );
    expect(easy.confidence.level).not.toBe('HIGH');
  });

  it('keeps provider speed when the style is hard', () => {
    const result = run({
      intensity: 'hard',
      usedCyclingGeometry: true,
      routeDistanceM: 20_000,
      rideDurationMin: 60,
      points: [point(), point({ lat: 59.95 })],
      sampleProgress: [0, 1],
    });
    expect(result.exposure.speedSource).toBe('cycling_geometry');
    expect(result.exposure.durationWeightedSpeedKmh).toBe(20);
  });

  it('gives a faster ground speed to the shorter provider leg', () => {
    const result = run({
      intensity: 'steady',
      usedCyclingGeometry: true,
      routeDistanceM: 20_000,
      rideDurationMin: 60,
      legs: [
        { distanceM: 10_000, durationMin: 40 },
        { distanceM: 10_000, durationMin: 20 },
      ],
      points: [point(), point({ lat: 60 })],
      sampleProgress: [0, 1],
    });
    expect(result.exposure.segments.map((segment) => segment.expectedSpeedKmh)).toEqual([
      15,
      30,
    ]);
  });

  it('packs the shell on a hard dry ride and does not wear it', () => {
    const hard = run({ intensity: 'hard' });
    expect(codes(hard)).toContain('VENT_OR_PACK_SHELL');
    expect(hard.wear.some((item) => item.slot === 'shell')).toBe(false);
    expect(hard.pack.some((item) => item.slot === 'shell')).toBe(true);
    expect(hard.cyclingPersonalOffsetsApplied).toBe(false);

    const easy = run({ intensity: 'easy' });
    expect(codes(easy)).not.toContain('VENT_OR_PACK_SHELL');
    expect(easy.pack.some((item) => item.slot === 'shell')).toBe(false);
    expect(hard.exposure.cyclingExposureSustainedC).toBeGreaterThan(
      easy.exposure.cyclingExposureSustainedC,
    );
  });

  it('packs a shell for a short wet ending and wears it when rain is sustained', () => {
    const distant = run({
      intensity: 'steady',
      points: [
        point(),
        point({ lat: 59.92 }),
        point({ lat: 59.93, precipitationProbPct: 80, precipitationMm: 2 }),
      ],
    });
    expect(distant.demand.sustainedWater).toBeLessThan(distant.demand.peakWater);
    expect(codes(distant)).toContain('PACK_SHELL_FOR_LATER_RAIN');
    expect(distant.wear.some((item) => item.slot === 'shell')).toBe(false);
    expect(distant.pack.some((item) => item.slot === 'shell')).toBe(true);

    const soaked = run({
      intensity: 'steady',
      points: [
        point({ precipitationProbPct: 80, precipitationMm: 2 }),
        point({ lat: 59.92, precipitationProbPct: 80, precipitationMm: 2 }),
        point({ lat: 59.93, precipitationProbPct: 80, precipitationMm: 2 }),
      ],
    });
    expect(codes(soaked)).toContain('WEAR_SHELL_FOR_RAIN');
    expect(soaked.wear.some((item) => item.slot === 'shell')).toBe(true);
    expect(soaked.pack.some((item) => item.slot === 'shell')).toBe(false);
  });

  it('ignores motorcycle garments and uses a cycling-tagged shell', () => {
    const result = run({
      intensity: 'steady',
      points: [
        point({ airTempC: 2, windSpeedMs: 8, precipitationProbPct: 80, precipitationMm: 1 }),
        point({
          lat: 59.92,
          airTempC: 2,
          windSpeedMs: 8,
          precipitationProbPct: 80,
          precipitationMm: 1,
        }),
      ],
      wardrobe: [
        garment({
          name: 'Armoured jacket',
          category: 'shell_jacket',
          activityTags: ['motorcycle'],
        }),
        garment({ name: 'Ride shell', category: 'shell_jacket' }),
      ],
    });
    const shell = result.wear.find((item) => item.slot === 'shell');
    expect(shell?.source).toBe('wardrobe');
    expect(shell?.garmentName).toBe('Ride shell');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Armoured');
    expect(serialized.toLowerCase()).not.toContain('motorcycle');
    expect(serialized.toLowerCase()).not.toContain('armour');
  });

  it('uses generic cycling copy when nothing is tagged for cycling', () => {
    const result = run({ wardrobe: [] });
    expect(codes(result)).toContain('GENERIC_KIT_NO_CYCLING_TAGS');
    expect(result.wear.every((item) => item.source === 'generic')).toBe(true);
    expect(result.wear.map((item) => item.genericLabel).join(' ')).toContain('Cycling');
    expect(codes(result)).toContain('HELMET_ASSUMED_NOT_SELECTED');
    expect(result.wear.some((item) => item.slot === 'head' && item.genericLabel?.includes('helmet is'))).toBe(
      false,
    );
  });

  it('treats a headwind as more airflow than a tailwind', () => {
    const head = cyclingApparentAirflow({
      expectedSpeedKmh: 22,
      windSpeedMs: 5,
      headingDeg: 0,
      windFromDeg: 0,
    });
    const tail = cyclingApparentAirflow({
      expectedSpeedKmh: 22,
      windSpeedMs: 5,
      headingDeg: 0,
      windFromDeg: 180,
    });
    expect(head.mode).toBe('vector');
    expect(head.apparentAirflowMs).toBeGreaterThan(tail.apparentAirflowMs);

    const unspecified = run({
      intensity: 'steady',
      points: [point({ windFromDeg: null })],
    });
    expect(codes(unspecified)).toContain('WIND_DIRECTION_UNAVAILABLE');
    expect(unspecified.exposure.windDirectionUsed).toBe(false);
  });

  it('records ground elevation only when a sample has it', () => {
    const withHeight = run({
      usedCyclingGeometry: true,
      routeDistanceM: 30_000,
      rideDurationMin: 80,
      sampleProgress: [0, 0.5, 1],
      points: [
        point({ groundElevationM: 20 }),
        point({ lat: 59.92, groundElevationM: 140 }),
        point({ lat: 59.93, groundElevationM: 80 }),
      ],
      wardrobe: [
        garment({ name: 'Base', category: 'base_layer' }),
        garment({ name: 'Jersey', category: 'mid_layer' }),
      ],
    });
    expect(codes(withHeight)).toContain('GROUND_ELEVATION_USED');
    expect(withHeight.confidence.level).toBe('HIGH');

    const without = run({
      ...{
        usedCyclingGeometry: true,
        routeDistanceM: 30_000,
        rideDurationMin: 80,
        sampleProgress: [0, 0.5, 1],
        wardrobe: [
          garment({ name: 'Base', category: 'base_layer' }),
          garment({ name: 'Jersey', category: 'mid_layer' }),
        ],
      },
    });
    expect(codes(without)).toContain('GROUND_ELEVATION_UNAVAILABLE');
    expect(without.confidence.level).not.toBe('HIGH');
  });

  it('does not claim a style or a high confidence when intensity was omitted', () => {
    const result = run({
      intensity: null,
      usedCyclingGeometry: true,
      routeDistanceM: 20_000,
      rideDurationMin: 60,
      points: [
        point({ groundElevationM: 40 }),
        point({ lat: 59.92, groundElevationM: 40 }),
        point({ lat: 59.93, groundElevationM: 40 }),
      ],
    });
    expect(result.intensitySpecified).toBe(false);
    expect(codes(result)).toContain('CYCLING_INTENSITY_UNSPECIFIED');
    expect(result.confidence.level).not.toBe('HIGH');
  });

  it('makes a cold-sensitive rider colder than a rider who runs warm', () => {
    const cold = run({ intensity: 'steady', coldSensitivity: -1, points: [point()] });
    const warm = run({ intensity: 'steady', coldSensitivity: 1, points: [point()] });
    expect(cold.exposure.cyclingExposureSustainedC).toBeLessThan(
      warm.exposure.cyclingExposureSustainedC,
    );
    expect(codes(cold)).toContain('BASELINE_NO_CYCLING_OFFSETS');
  });

  it('returns a low-confidence fallback when weather is missing', () => {
    const result = run({ points: [], intensity: 'steady' });
    expect(result.confidence.level).toBe('LOW');
    expect(codes(result)).toContain('INCOMPLETE_WEATHER');
    expect(codes(result)).not.toContain('SUSTAINED_COLD');
    expect(result.wear.map((item) => item.slot)).toEqual(['base', 'jersey', 'legs']);
  });
});
