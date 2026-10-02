import { resolveAlpineSites, runAlpineRecommendationPipeline } from './alpine';
import { runCyclingRecommendationPipeline } from './cycling';
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
    windSpeedMs: 2,
    ...partial,
  };
}

describe('activity thermal bias', () => {
  it('lowers cycling exposure only when this activity has a cold bias', () => {
    const weather = {
      provider: 'met',
      sampledAt: '2026-10-02T12:00:00.000Z',
      points: [point({ airTempC: 12 })],
      minTempC: 12,
      maxTempC: 12,
      maxRainProbPct: 0,
      maxPrecipMm: 0,
      maxWindMs: 2,
    };
    const base = runCyclingRecommendationPipeline({
      weather,
      wardrobe: [],
      rideDurationMin: 60,
      intensity: 'steady',
      geometryFallback: true,
    });
    const cold = runCyclingRecommendationPipeline({
      weather,
      wardrobe: [],
      rideDurationMin: 60,
      intensity: 'steady',
      geometryFallback: true,
      personalColdBiasC: 1,
      personalSampleCount: 6,
    });
    expect(base.personalization.personalColdBiasC).toBe(0);
    expect(cold.personalization.personalColdBiasC).toBe(1);
    expect(cold.personalization.canClaimPersonal).toBe(false);
    expect(cold.exposure.cyclingExposureSustainedC).toBeCloseTo(
      base.exposure.cyclingExposureSustainedC - 1,
      5,
    );
    expect(cold.exposure.segments[0].airTempC).toBe(
      base.exposure.segments[0].airTempC,
    );
  });

  it('keeps alpine air temperature and applies bias only to exposure', () => {
    const plan = resolveAlpineSites([
      { lat: 61, lon: 8, label: 'Base', elevationM: 1000 },
    ]);
    const weather: WeatherPoint = {
      lat: 61,
      lon: 8,
      airTempC: 2,
      precipitationProbPct: 0,
      precipitationMm: 0,
      windSpeedMs: 2,
      groundElevationM: 1000,
    };
    const input = {
      discipline: 'alpine_skiing' as const,
      exposureMode: 'base',
      durationMin: 60,
      plan,
      samples: [
        {
          role: 'base' as const,
          phase: 'start' as const,
          estimated: false,
          weather,
        },
      ],
      wardrobe: [],
    };
    const base = runAlpineRecommendationPipeline(input);
    const cold = runAlpineRecommendationPipeline({
      ...input,
      personalColdBiasC: 1,
    });
    expect(base.exposure.baseTempC).toBe(2);
    expect(cold.exposure.baseTempC).toBe(2);
    expect(base.personalization.personalColdBiasC).toBe(0);
    expect(cold.exposure.wornExposureC).toBeCloseTo(
      (base.exposure.wornExposureC ?? 0) - 1,
      5,
    );
    expect(cold.exposure.samples[0].exposureC).toBeCloseTo(
      base.exposure.samples[0].exposureC - 1,
      5,
    );
    expect(cold.personalization.canClaimPersonal).toBe(false);
  });

  it('lowers cross-country exposure without borrowing another activity bias', () => {
    const weather = {
      provider: 'met',
      sampledAt: '2026-10-02T08:00:00.000Z',
      points: [point({ airTempC: 1, groundElevationM: 200 })],
      minTempC: 1,
      maxTempC: 1,
      maxRainProbPct: 0,
      maxPrecipMm: 0,
      maxWindMs: 2,
    };
    const base = runXcRecommendationPipeline({
      weather,
      wardrobe: [],
      durationMin: 90,
      durationAssumed: false,
      intensity: 'steady',
      style: 'classic',
    });
    const cold = runXcRecommendationPipeline({
      weather,
      wardrobe: [],
      durationMin: 90,
      durationAssumed: false,
      intensity: 'steady',
      style: 'classic',
      personalColdBiasC: 1,
    });
    expect(base.personalization.personalColdBiasC).toBe(0);
    expect(cold.exposure.xcExposureSustainedC).toBeCloseTo(
      base.exposure.xcExposureSustainedC - 1,
      5,
    );
    expect(cold.personalization.canClaimPersonal).toBe(false);
  });
});
