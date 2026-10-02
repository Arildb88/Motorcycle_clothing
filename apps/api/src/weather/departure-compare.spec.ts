import {
  comparisonRowFromSamples,
  nearbyDepartureTimes,
} from './departure-compare';

describe('nearbyDepartureTimes', () => {
  const now = new Date('2026-10-02T12:00:00.000Z');

  it('keeps the previous hour and the next two when they are still ahead', () => {
    expect(
      nearbyDepartureTimes(new Date('2026-10-02T15:00:00.000Z'), now).map(
        (time) => time.toISOString(),
      ),
    ).toEqual([
      '2026-10-02T14:00:00.000Z',
      '2026-10-02T15:00:00.000Z',
      '2026-10-02T16:00:00.000Z',
      '2026-10-02T17:00:00.000Z',
    ]);
  });

  it('drops a past hour and fills four departures forward from now', () => {
    expect(
      nearbyDepartureTimes(now, now).map((time) => time.toISOString()),
    ).toEqual([
      '2026-10-02T12:00:00.000Z',
      '2026-10-02T13:00:00.000Z',
      '2026-10-02T14:00:00.000Z',
      '2026-10-02T15:00:00.000Z',
    ]);
  });

  it('keeps a long-past choice together with the following hour', () => {
    expect(
      nearbyDepartureTimes(new Date('2026-10-02T02:00:00.000Z'), now).map(
        (time) => time.toISOString(),
      ),
    ).toEqual(['2026-10-02T02:00:00.000Z', '2026-10-02T03:00:00.000Z']);
  });
});

describe('comparisonRowFromSamples', () => {
  it('summarizes matched samples and lists the times that had no forecast', () => {
    const row = comparisonRowFromSamples(
      [
        {
          requestedAt: '2026-10-02T12:00:00.000Z',
          available: true,
          forecastAt: '2026-10-02T12:00:00.000Z',
          airTempC: 4,
          precipitationProbPct: 10,
          precipitationMm: 0,
          windSpeedMs: 3,
        },
        {
          requestedAt: '2026-10-02T13:00:00.000Z',
          available: true,
          forecastAt: '2026-10-02T13:00:00.000Z',
          airTempC: 7,
          precipitationProbPct: 40,
          precipitationMm: 0.6,
          windSpeedMs: 5,
        },
        {
          requestedAt: '2026-10-02T14:00:00.000Z',
          available: false,
          reason: 'out_of_range',
        },
      ],
      true,
    );

    expect(row.available).toBe(true);
    expect(row.conditions).toEqual({
      minTempC: 4,
      maxTempC: 7,
      maxRainProbPct: 40,
      maxPrecipMm: 0.6,
      maxWindMs: 5,
      forecastFrom: '2026-10-02T12:00:00.000Z',
      forecastTo: '2026-10-02T13:00:00.000Z',
    });
    expect(row.missingAt).toEqual(['2026-10-02T14:00:00.000Z']);
    expect(row).not.toHaveProperty('score');
  });

  it('does not invent conditions when every sample is out of range', () => {
    const row = comparisonRowFromSamples(
      [
        {
          requestedAt: '2026-10-04T12:00:00.000Z',
          available: false,
          reason: 'out_of_range',
        },
      ],
      true,
    );
    expect(row.available).toBe(false);
    expect(row.unavailableReason).toBe('out_of_range');
    expect(row.conditions).toBeUndefined();
  });
});
