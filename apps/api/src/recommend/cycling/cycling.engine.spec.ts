import { motorcycleExposureC } from '../motorcycle/exposure';
import { CYCLING_STYLE_SPEED_KMH } from './constants';
import { cyclingExposureC } from './exposure';
import { runCyclingRecommendationPipeline } from './pipeline';
import type { CyclingGarmentInput } from './types';
import type { RouteWeatherSummary, WeatherPoint } from '../weather.types';

function point(
  partial: Partial<WeatherPoint> & Pick<WeatherPoint, 'airTempC'>,
): WeatherPoint {
  return {
    lat: 59.91,
    lon: 10.75,
    precipitationProbPct: 0,
    precipitationMm: 0,
    windSpeedMs: 3,
    ...partial,
  };
}

function weather(
  points: WeatherPoint[],
  elevation = false,
): RouteWeatherSummary {
  return {
    provider: 'met',
    sampledAt: '2026-10-02T12:00:00.000Z',
    points,
    minTempC: Math.min(...points.map((item) => item.airTempC)),
    maxTempC: Math.max(...points.map((item) => item.airTempC)),
    maxRainProbPct: Math.max(
      ...points.map((item) => item.precipitationProbPct),
    ),
    maxPrecipMm: Math.max(...points.map((item) => item.precipitationMm)),
    maxWindMs: Math.max(...points.map((item) => item.windSpeedMs)),
    elevation: elevation
      ? { provider: 'kartverket', attribution: '© Kartverket' }
      : null,
  };
}

function garment(
  partial: Partial<CyclingGarmentInput> &
    Pick<CyclingGarmentInput, 'id' | 'name' | 'category'>,
): CyclingGarmentInput {
  return {
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 2,
    windResistTier: 3,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: false,
    isHeated: false,
    activityTags: ['cycling'],
    components: [],
    ...partial,
  };
}

describe('cycling recommendation foundation', () => {
  it('uses cycling coefficients and style speeds, not motorcycle exposure defaults', () => {
    const sample = point({ airTempC: 8, windSpeedMs: 5 });
    const cycling = cyclingExposureC(sample, {
      apparentAirflowMs: CYCLING_STYLE_SPEED_KMH.steady / 3.6 + 5,
      intensity: 'steady',
    });
    const motorcycle = motorcycleExposureC(sample, {
      expectedSpeedKmh: CYCLING_STYLE_SPEED_KMH.steady,
    });
    expect(cycling).not.toBe(motorcycle);
    expect(CYCLING_STYLE_SPEED_KMH.hard).toBeLessThan(40);
    expect(CYCLING_STYLE_SPEED_KMH.easy).not.toBe(70);

    const hard = runCyclingRecommendationPipeline({
      weather: weather([point({ airTempC: 14, windSpeedMs: 2 })]),
      wardrobe: [],
      rideDurationMin: 60,
      intensity: 'hard',
      geometryFallback: true,
    });
    const easy = runCyclingRecommendationPipeline({
      weather: weather([point({ airTempC: 14, windSpeedMs: 2 })]),
      wardrobe: [],
      rideDurationMin: 60,
      intensity: 'easy',
      geometryFallback: true,
    });
    expect(hard.exposure.cyclingExposureSustainedC).toBeGreaterThan(
      easy.exposure.cyclingExposureSustainedC,
    );
    expect(hard.exposure.durationWeightedSpeedKmh).toBe(
      CYCLING_STYLE_SPEED_KMH.hard,
    );
    expect(hard.personalization.personalColdBiasC).toBe(0);
    expect(hard.personalization.canClaimPersonal).toBe(false);
  });

  it('packs or vents the shell on a hard dry ride and does not wear a closed shell', () => {
    const result = runCyclingRecommendationPipeline({
      weather: weather([
        point({ airTempC: 16, windSpeedMs: 2, precipitationProbPct: 5 }),
      ]),
      wardrobe: [
        garment({
          id: 'shell',
          name: 'Vented cycling shell',
          category: 'shell_jacket',
          hasVentilation: true,
        }),
      ],
      rideDurationMin: 75,
      intensity: 'hard',
      geometryFallback: true,
    });
    expect(
      result.reasons.some((reason) => reason.code === 'VENT_OR_PACK_SHELL'),
    ).toBe(true);
    const wornShell = result.wear.find((item) => item.slot === 'shell');
    const packedShell = result.pack.find((item) => item.slot === 'shell');
    expect(
      wornShell?.configuration.some((config) => config.code === 'VENTS_OPEN') ||
        packedShell,
    ).toBeTruthy();
    expect(
      wornShell?.configuration.some((config) => config.code === 'VENTS_CLOSED'),
    ).toBeFalsy();
  });

  it('packs rain from a later wet segment without dressing the whole ride for it', () => {
    const result = runCyclingRecommendationPipeline({
      weather: weather([
        point({ airTempC: 15, precipitationProbPct: 0 }),
        point({ airTempC: 15, precipitationProbPct: 0 }),
        point({ airTempC: 15, precipitationProbPct: 0 }),
        point({ airTempC: 14, precipitationProbPct: 80, precipitationMm: 1.2 }),
      ]),
      wardrobe: [],
      rideDurationMin: 120,
      intensity: 'steady',
      routeTravelSegments: [
        { durationMin: 40, expectedSpeedKmh: 24, headingDeg: 10 },
        { durationMin: 40, expectedSpeedKmh: 24, headingDeg: 20 },
        { durationMin: 30, expectedSpeedKmh: 24, headingDeg: 30 },
        { durationMin: 10, expectedSpeedKmh: 22, headingDeg: 40 },
      ],
      geometryFallback: false,
    });
    expect(
      result.reasons.some((reason) => reason.code === 'PACK_RAIN_LAYER'),
    ).toBe(true);
    expect(result.pack.some((item) => item.slot === 'rain')).toBe(true);
    expect(result.wear.some((item) => item.slot === 'rain')).toBe(false);
    expect(result.demand.sustainedWater).toBeLessThan(result.demand.peakWater);
  });

  it('does not let one short cold cell set the sustained outfit', () => {
    const result = runCyclingRecommendationPipeline({
      weather: weather([
        point({ airTempC: 14, windSpeedMs: 2 }),
        point({ airTempC: 14, windSpeedMs: 2 }),
        point({ airTempC: -2, windSpeedMs: 8, precipitationMm: 1 }),
      ]),
      wardrobe: [],
      rideDurationMin: 100,
      intensity: 'steady',
      routeTravelSegments: [
        { durationMin: 45, expectedSpeedKmh: 24, headingDeg: 90 },
        { durationMin: 45, expectedSpeedKmh: 24, headingDeg: 90 },
        { durationMin: 10, expectedSpeedKmh: 20, headingDeg: 90 },
      ],
      geometryFallback: false,
    });
    expect(result.demand.shortExtremeInfluencesPackOnly).toBe(true);
    expect(result.demand.sustainedWarmth).toBeLessThan(
      result.demand.peakWarmth,
    );
    expect(
      result.reasons.some((reason) => reason.code === 'SHORT_COLD_SEGMENT'),
    ).toBe(true);
    expect(
      result.wear.find((item) => item.slot === 'base')?.genericLabel,
    ).not.toContain('winter');
  });

  it('uses a generic cycling kit when the wardrobe has no cycling tags', () => {
    const result = runCyclingRecommendationPipeline({
      weather: weather([point({ airTempC: 6, windSpeedMs: 6 })]),
      wardrobe: [
        garment({
          id: 'moto',
          name: 'Armoured motorcycle jacket',
          category: 'shell_jacket',
          activityTags: ['motorcycle'],
        }),
        garment({
          id: 'suit',
          name: 'One piece suit',
          category: 'one_piece_suit',
          activityTags: ['cycling'],
        }),
      ],
      rideDurationMin: 50,
      intensity: 'easy',
      geometryFallback: true,
    });
    const labels = [...result.wear, ...result.pack].map(
      (item) => `${item.garmentName ?? ''} ${item.genericLabel ?? ''}`,
    );
    expect(labels.join(' ').toLowerCase()).not.toContain('motorcycle');
    expect(labels.join(' ').toLowerCase()).not.toContain('armour');
    expect(
      result.wear.concat(result.pack).some((item) => item.garmentId === 'moto'),
    ).toBe(false);
    expect(
      result.wear.concat(result.pack).some((item) => item.garmentId === 'suit'),
    ).toBe(false);
    expect(
      result.reasons.some((reason) => reason.code === 'GENERIC_CYCLING_KIT'),
    ).toBe(true);
    expect(
      result.reasons.some((reason) => reason.code === 'HELMET_ASSUMED'),
    ).toBe(true);
    expect(
      result.wear.concat(result.pack).some((item) => item.slot === 'helmet'),
    ).toBe(false);
    expect(result.confidence.level).not.toBe('HIGH');
  });

  it('prefers a cycling-tagged garment over a motorcycle garment in the same slot', () => {
    const result = runCyclingRecommendationPipeline({
      weather: weather([point({ airTempC: 4, windSpeedMs: 5 })]),
      wardrobe: [
        garment({
          id: 'moto',
          name: 'Motorcycle shell',
          category: 'shell_jacket',
          activityTags: ['motorcycle'],
          warmthTier: 5,
        }),
        garment({
          id: 'bike',
          name: 'Cycling shell',
          category: 'shell_jacket',
          activityTags: ['cycling'],
          warmthTier: 3,
        }),
      ],
      rideDurationMin: 40,
      intensity: 'steady',
      geometryFallback: true,
    });
    expect(result.wear.find((item) => item.slot === 'shell')?.garmentId).toBe(
      'bike',
    );
  });

  it('uses vector wind only when heading and wind direction both exist', () => {
    const shared = {
      wardrobe: [],
      rideDurationMin: 30,
      intensity: 'steady' as const,
      routeTravelSegments: [
        { durationMin: 30, expectedSpeedKmh: 25, headingDeg: 0 },
      ],
      geometryFallback: false,
    };
    const headwind = runCyclingRecommendationPipeline({
      ...shared,
      weather: weather([
        point({ airTempC: 8, windSpeedMs: 8, windFromDeg: 0 }),
      ]),
    });
    const tailwind = runCyclingRecommendationPipeline({
      ...shared,
      weather: weather([
        point({ airTempC: 8, windSpeedMs: 8, windFromDeg: 180 }),
      ]),
    });
    const scalar = runCyclingRecommendationPipeline({
      ...shared,
      weather: weather([point({ airTempC: 8, windSpeedMs: 8 })]),
    });
    expect(headwind.exposure.segments[0].airflowMode).toBe('vector');
    expect(tailwind.exposure.segments[0].airflowMode).toBe('vector');
    expect(headwind.exposure.cyclingExposureSustainedC).toBeLessThan(
      tailwind.exposure.cyclingExposureSustainedC,
    );
    expect(scalar.exposure.windDirectionUsed).toBe(false);
    expect(scalar.exposure.segments[0].airflowMode).toBe('scalar_sum');
    expect(
      scalar.reasons.some(
        (reason) => reason.code === 'WIND_DIRECTION_UNAVAILABLE',
      ),
    ).toBe(true);
  });

  it('falls back safely when style, routing, weather, or elevation is missing', () => {
    const result = runCyclingRecommendationPipeline({
      weather: weather([]),
      wardrobe: [],
      rideDurationMin: 45,
      intensity: 'race',
      geometryFallback: true,
    });
    expect(result.intensity).toBe('steady');
    expect(result.intensityAssumed).toBe(true);
    expect(result.geometry).toBe('waypoint_fallback');
    expect(result.elevation).toBe('unavailable');
    expect(result.confidence.level).toBe('LOW');
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'ASSUMED_RIDE_STYLE',
        'ROUTE_GEOMETRY_FALLBACK',
        'INCOMPLETE_WEATHER',
        'ELEVATION_UNAVAILABLE',
        'HELMET_ASSUMED',
        'BASELINE_NO_PERSONAL_EVIDENCE',
      ]),
    );
    expect(result.wear.length).toBeGreaterThan(0);
    expect(result.exposure.durationWeightedSpeedKmh).toBe(
      CYCLING_STYLE_SPEED_KMH.steady,
    );

    const elevated = runCyclingRecommendationPipeline({
      weather: weather(
        [point({ airTempC: 9, windSpeedMs: 2, groundElevationM: 420 })],
        true,
      ),
      wardrobe: [],
      rideDurationMin: 30,
      intensity: 'easy',
      geometryFallback: false,
      routeTravelSegments: [
        { durationMin: 30, expectedSpeedKmh: 20, headingDeg: null },
      ],
    });
    expect(elevated.elevation).toBe('used');
    expect(
      elevated.reasons.some((reason) => reason.code === 'ELEVATION_USED'),
    ).toBe(true);
    expect(elevated.exposure.segments[0].groundElevationM).toBe(420);
  });
});
