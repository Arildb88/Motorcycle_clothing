import { NullRoutingAdapter } from './null-routing.adapter';

describe('NullRoutingAdapter', () => {
  const adapter = new NullRoutingAdapter();

  it('builds duration-weighted travel segments from ordered waypoints', async () => {
    const analysis = await adapter.analyze({
      waypoints: [
        { lat: 58.15, lon: 8.0 },
        { lat: 58.2, lon: 8.1 },
        { lat: 58.25, lon: 8.2 },
      ],
      preferences: { avoidMotorways: true },
      durationMin: 50,
      travelProfile: 'motorcycle',
    });

    expect(analysis).not.toBeNull();
    expect(analysis!.durationMin).toBe(50);
    expect(analysis!.travelSegments).toHaveLength(2);
    expect(analysis!.preferencesApplied.avoidMotorways).toBe(true);
    expect(analysis!.meta.fallback).toBe(true);
    expect(analysis!.meta.fromProvider).toBe(false);
    expect(analysis!.meta.provider).toBe('null');

    const sum = analysis!.travelSegments.reduce(
      (s, seg) => s + seg.durationMin,
      0,
    );
    expect(sum).toBe(50);
    expect(
      analysis!.travelSegments.every((s) => s.expectedSpeedKmh > 0),
    ).toBe(true);
  });

  it('returns null for fewer than 2 waypoints', async () => {
    await expect(
      adapter.analyze({ waypoints: [{ lat: 58, lon: 8 }] }),
    ).resolves.toBeNull();
  });
});
