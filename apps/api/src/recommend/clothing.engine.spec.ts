import {
  recommendClothing,
  biasDeltaFromRating,
  RouteWeatherSummary,
  ComfortInput,
} from './clothing.engine';

const baseWeather: RouteWeatherSummary = {
  provider: 'mock',
  sampledAt: new Date().toISOString(),
  points: [],
  minTempC: 4,
  maxTempC: 6,
  maxRainProbPct: 10,
  maxPrecipMm: 0,
  maxWindMs: 8,
};

const baseComfort: ComfortInput = {
  glovesBelowC: 10,
  extraJacketLayerBelowC: 12,
  extraPantsLayerBelowC: 8,
  woolBaseBelowC: 5,
  rainProbThreshold: 40,
  windChillSensitivity: 'medium',
  personalColdBiasC: 0,
};

describe('recommendClothing', () => {
  it('recommends gloves and layers when cold and windy', () => {
    const result = recommendClothing(baseWeather, baseComfort);
    expect(result.gloves).toBe(true);
    expect(result.extraJacketLayer).toBe(true);
    expect(result.extraPantsLayer).toBe(true);
    expect(result.woolBase).toBe(true);
    expect(result.items).toContain('Winter gloves');
  });

  it('recommends rain gear when probability is high', () => {
    const result = recommendClothing(
      { ...baseWeather, minTempC: 18, maxTempC: 20, maxWindMs: 2, maxRainProbPct: 70 },
      baseComfort,
    );
    expect(result.rainGear).toBe(true);
    expect(result.gloves).toBe(false);
  });

  it('applies personal cold bias', () => {
    const without = recommendClothing(baseWeather, baseComfort);
    const withBias = recommendClothing(baseWeather, {
      ...baseComfort,
      personalColdBiasC: 3,
    });
    expect(withBias.effectiveTempC).toBeLessThan(without.effectiveTempC);
  });
});

describe('biasDeltaFromRating', () => {
  it('maps ratings to bounded deltas', () => {
    expect(biasDeltaFromRating('too_cold')).toBe(1);
    expect(biasDeltaFromRating('ok')).toBe(0);
    expect(biasDeltaFromRating('too_warm')).toBe(-1);
  });
});
