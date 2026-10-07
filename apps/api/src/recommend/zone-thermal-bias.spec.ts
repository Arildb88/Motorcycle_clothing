import { resolveAlpineSites, runAlpineRecommendationPipeline } from './alpine';
import { runCyclingRecommendationPipeline } from './cycling';
import { warmthDemandFromExposureC } from './motorcycle/exposure';
import { computeDemand } from './motorcycle/demand';
import type { RideSegment } from './motorcycle/types';
import { runXcRecommendationPipeline } from './xc';
import type { WeatherPoint } from './weather.types';

function point(
  partial: Partial<WeatherPoint> & Pick<WeatherPoint, 'airTempC'>,
): WeatherPoint {
  return {
    lat: 59.91,
    lon: 10.75,
    precipitationProbPct: 0,
    precipitationMm: 0,
    windSpeedMs: 0,
    ...partial,
  };
}

function segment(exposureC: number): RideSegment {
  return {
    index: 0,
    durationMin: 60,
    fraction: 1,
    weather: point({ airTempC: exposureC }),
    expectedSpeedKmh: 70,
    speedSource: 'explicit_cruise',
    apparentAirflowMs: 0,
    airflowMode: 'scalar_sum',
    motorcycleExposureC: exposureC,
    warmthDemand: warmthDemandFromExposureC(exposureC),
    windDemand: 1,
    waterDemand: 1,
    isShortExtreme: false,
  };
}

describe('zone thermal bias', () => {
  it('keeps a new user on the unbiased demand', () => {
    const segments = [segment(7)];
    expect(computeDemand(segments, { torso: 0, legs: 0 })).toEqual(
      computeDemand(segments),
    );
  });

  it('warms only the motorcycle zone that was cold', () => {
    const segments = [segment(7)];
    const base = computeDemand(segments).demand;
    const torsoCold = computeDemand(segments, { torso: 2, legs: 0 }).demand;
    const legsCold = computeDemand(segments, { torso: 0, legs: 2 }).demand;

    expect(base.sustained.find((zone) => zone.zone === 'torso')?.warmth).toBe(
      2,
    );
    expect(
      torsoCold.sustained.find((zone) => zone.zone === 'torso')?.warmth,
    ).toBe(3);
    expect(
      torsoCold.sustained.find((zone) => zone.zone === 'legs')?.warmth,
    ).toBe(base.sustained.find((zone) => zone.zone === 'legs')?.warmth);
    expect(
      torsoCold.sustained.find((zone) => zone.zone === 'hands')?.warmth,
    ).toBe(base.sustained.find((zone) => zone.zone === 'hands')?.warmth);
    expect(
      legsCold.sustained.find((zone) => zone.zone === 'legs')?.warmth,
    ).toBe(3);
    expect(
      legsCold.sustained.find((zone) => zone.zone === 'torso')?.warmth,
    ).toBe(2);
    expect(torsoCold.sustainedWarmth).toBe(base.sustainedWarmth);
  });

  it('changes cycling kit for the rated zone only', () => {
    const input = {
      weather: {
        provider: 'met',
        sampledAt: '2026-10-07T12:00:00.000Z',
        points: [point({ airTempC: 17 })],
        minTempC: 17,
        maxTempC: 17,
        maxRainProbPct: 0,
        maxPrecipMm: 0,
        maxWindMs: 0,
      },
      wardrobe: [],
      rideDurationMin: 60,
      intensity: 'steady',
      geometryFallback: true,
    };
    const base = runCyclingRecommendationPipeline(input);
    const torsoCold = runCyclingRecommendationPipeline({
      ...input,
      zoneColdBiasC: { torso: 4, legs: 0 },
    });
    const legsCold = runCyclingRecommendationPipeline({
      ...input,
      zoneColdBiasC: { torso: 0, legs: 4 },
    });

    const warmth = (
      result: ReturnType<typeof runCyclingRecommendationPipeline>,
      zone: string,
    ) => result.demand.sustained.find((item) => item.zone === zone)?.warmth;

    expect(warmth(base, 'torso')).toBe(2);
    expect(warmth(torsoCold, 'torso')).toBe(3);
    expect(warmth(torsoCold, 'legs')).toBe(warmth(base, 'legs'));
    expect(warmth(torsoCold, 'hands')).toBe(warmth(base, 'hands'));
    expect(torsoCold.wear.map((item) => item.slot)).toContain('mid');
    expect(base.wear.map((item) => item.slot)).not.toContain('mid');
    expect(
      torsoCold.wear.find((item) => item.slot === 'legs')?.genericLabel,
    ).toBe(base.wear.find((item) => item.slot === 'legs')?.genericLabel);
    expect(torsoCold.exposure.cyclingExposureSustainedC).toBe(
      base.exposure.cyclingExposureSustainedC,
    );

    expect(warmth(legsCold, 'legs')).toBe(3);
    expect(warmth(legsCold, 'torso')).toBe(2);
    expect(legsCold.wear.map((item) => item.slot)).not.toContain('mid');
    expect(
      legsCold.wear.find((item) => item.slot === 'legs')?.genericLabel,
    ).toBe('Cycling tights');
    expect(base.wear.find((item) => item.slot === 'legs')?.genericLabel).toBe(
      'Cycling shorts or light tights',
    );
  });

  it('changes alpine torso and legs warmth independently', () => {
    const plan = resolveAlpineSites([
      { lat: 61, lon: 8, label: 'Base', elevationM: 1000 },
    ]);
    const input = {
      discipline: 'alpine_skiing' as const,
      exposureMode: 'lift',
      durationMin: 120,
      plan,
      samples: [
        {
          role: 'base' as const,
          phase: 'start' as const,
          estimated: false,
          weather: point({
            lat: 61,
            lon: 8,
            airTempC: 0,
            windSpeedMs: 0,
            groundElevationM: 1000,
          }),
        },
      ],
      wardrobe: [],
    };
    const base = runAlpineRecommendationPipeline(input);
    const torsoCold = runAlpineRecommendationPipeline({
      ...input,
      zoneColdBiasC: { torso: 4, legs: 0 },
    });
    const legsHot = runAlpineRecommendationPipeline({
      ...input,
      zoneColdBiasC: { torso: 0, legs: -6 },
    });

    expect(base.wear.find((item) => item.slot === 'mid')).toBeUndefined();
    expect(torsoCold.wear.find((item) => item.slot === 'mid')?.zone).toBe(
      'torso',
    );
    expect(
      torsoCold.wear.find((item) => item.slot === 'legs')?.genericLabel,
    ).toBe(base.wear.find((item) => item.slot === 'legs')?.genericLabel);
    expect(
      torsoCold.wear.find((item) => item.slot === 'hands')?.genericLabel,
    ).toBe(base.wear.find((item) => item.slot === 'hands')?.genericLabel);
    expect(torsoCold.exposure.wornExposureC).toBe(base.exposure.wornExposureC);

    expect(legsHot.wear.find((item) => item.slot === 'legs')).toBeUndefined();
    expect(legsHot.wear.find((item) => item.slot === 'mid')).toBeUndefined();
    expect(
      legsHot.wear.find((item) => item.slot === 'hands')?.genericLabel,
    ).toBe(base.wear.find((item) => item.slot === 'hands')?.genericLabel);
  });

  it('does not let a cross-country torso bias warm the legs', () => {
    const weather = {
      provider: 'met',
      sampledAt: '2026-10-07T08:00:00.000Z',
      points: [point({ airTempC: 8, windSpeedMs: 0, groundElevationM: 200 })],
      minTempC: 8,
      maxTempC: 8,
      maxRainProbPct: 0,
      maxPrecipMm: 0,
      maxWindMs: 0,
    };
    const input = {
      weather,
      wardrobe: [],
      durationMin: 90,
      durationAssumed: false,
      intensity: 'steady',
      style: 'classic',
    };
    const base = runXcRecommendationPipeline(input);
    const torsoCold = runXcRecommendationPipeline({
      ...input,
      zoneColdBiasC: { torso: 8, legs: 0 },
    });
    const warmth = (
      result: ReturnType<typeof runXcRecommendationPipeline>,
      zone: string,
    ) => result.demand.sustained.find((item) => item.zone === zone)?.warmth;
    expect(warmth(torsoCold, 'torso')).toBeGreaterThan(
      warmth(base, 'torso') ?? 0,
    );
    expect(warmth(torsoCold, 'legs')).toBe(warmth(base, 'legs'));
    expect(
      torsoCold.wear.find((item) => item.slot === 'legs')?.genericLabel,
    ).toBe(base.wear.find((item) => item.slot === 'legs')?.genericLabel);
  });
});
