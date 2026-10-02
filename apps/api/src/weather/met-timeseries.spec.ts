import {
  FORECAST_MATCH_MAX_GAP_MS,
  matchMetTimeseries,
  selectMetTimeseriesIndex,
} from './met-timeseries';

describe('selectMetTimeseriesIndex', () => {
  const times = [
    '2026-10-01T08:00:00Z',
    '2026-10-01T09:00:00Z',
    '2026-10-01T12:00:00Z',
    'not-a-time',
  ];

  it('returns the first entry when no ETA is supplied', () => {
    expect(selectMetTimeseriesIndex(times, null)).toBe(0);
    expect(selectMetTimeseriesIndex(times)).toBe(0);
  });

  it('selects the forecast hour closest to the ETA', () => {
    expect(
      selectMetTimeseriesIndex(times, new Date('2026-10-01T09:20:00Z')),
    ).toBe(1);
    expect(
      selectMetTimeseriesIndex(times, new Date('2026-10-01T11:40:00Z')),
    ).toBe(2);
  });

  it('ignores invalid timestamps', () => {
    expect(
      selectMetTimeseriesIndex(
        ['nope', '2026-10-01T15:00:00Z'],
        new Date('2026-10-01T15:10:00Z'),
      ),
    ).toBe(1);
  });
});

describe('matchMetTimeseries', () => {
  const times = ['2026-10-02T12:00:00Z', '2026-10-02T18:00:00Z'];

  it('accepts a step within the published gap and rejects a later hole', () => {
    const near = matchMetTimeseries(times, new Date('2026-10-02T15:00:00Z'));
    expect(near?.inRange).toBe(true);
    expect(near?.gapMs).toBe(FORECAST_MATCH_MAX_GAP_MS);
    expect(near?.matchedAt).toBe('2026-10-02T12:00:00.000Z');

    const far = matchMetTimeseries(times, new Date('2026-10-04T12:00:00Z'));
    expect(far?.inRange).toBe(false);
    expect(far?.matchedAt).toBe('2026-10-02T18:00:00.000Z');
  });

  it('returns null when the series has no time', () => {
    expect(matchMetTimeseries([], new Date('2026-10-02T12:00:00Z'))).toBeNull();
    expect(
      matchMetTimeseries(['nope'], new Date('2026-10-02T12:00:00Z')),
    ).toBeNull();
  });
});
