import {
  biasDeltaFromRating,
  RouteWeatherSummary,
} from './clothing.engine';

describe('biasDeltaFromRating', () => {
  it('maps ratings to bounded deltas', () => {
    expect(biasDeltaFromRating('too_cold')).toBe(1);
    expect(biasDeltaFromRating('ok')).toBe(0);
    expect(biasDeltaFromRating('too_warm')).toBe(-1);
  });
});

// Spike recommendClothing removed in M3 — see motorcycle/*.spec.ts
void (null as unknown as RouteWeatherSummary);
