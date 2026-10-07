import {
  addCivilDays,
  commuteDifferenceCodes,
  composeCommutePreparation,
  osloInstant,
  osloParts,
  resolveCommuteClocks,
  reverseWaypoints,
} from './commute';
import type { KitItem } from '../recommend/motorcycle';
import type { RouteWeatherSummary } from '../recommend/weather.types';

function weather(
  minTempC: number,
  maxPrecipMm: number,
  maxRainProbPct: number,
): RouteWeatherSummary {
  return {
    provider: 'test',
    sampledAt: '2026-10-07T06:00:00.000Z',
    points: [],
    minTempC,
    maxTempC: minTempC,
    maxRainProbPct,
    maxPrecipMm,
    maxWindMs: 3,
  };
}

function item(partial: Partial<KitItem> & Pick<KitItem, 'slot'>): KitItem {
  return {
    mode: 'wear',
    source: 'wardrobe',
    zone: 'torso',
    configuration: [],
    ...partial,
  };
}

describe('Europe/Oslo commute clocks', () => {
  it('uses CET in January and CEST in July', () => {
    const winter = osloInstant('2026-01-15', '07:30');
    const summer = osloInstant('2026-07-15', '07:30');
    expect(winter.ok && winter.instant.toISOString()).toBe(
      '2026-01-15T06:30:00.000Z',
    );
    expect(summer.ok && summer.instant.toISOString()).toBe(
      '2026-07-15T05:30:00.000Z',
    );
  });

  it('rejects the spring-forward gap and keeps the clocks on either side', () => {
    const gap = osloInstant('2026-03-29', '02:30');
    expect(gap).toEqual({ ok: false, reason: 'gap' });

    const before = osloInstant('2026-03-29', '01:30');
    const after = osloInstant('2026-03-29', '03:30');
    expect(before.ok && before.instant.toISOString()).toBe(
      '2026-03-29T00:30:00.000Z',
    );
    expect(after.ok && after.instant.toISOString()).toBe(
      '2026-03-29T01:30:00.000Z',
    );
    expect(before.ok && osloParts(before.instant)?.time).toBe('01:30');
    expect(after.ok && osloParts(after.instant)?.time).toBe('03:30');
  });

  it('uses the earlier instant when the autumn clock repeats', () => {
    const repeated = osloInstant('2026-10-25', '02:30');
    expect(repeated.ok && repeated.ambiguous).toBe(true);
    expect(repeated.ok && repeated.instant.toISOString()).toBe(
      '2026-10-25T00:30:00.000Z',
    );
    expect(repeated.ok && osloParts(repeated.instant)?.time).toBe('02:30');
  });

  it('places an overnight return on the next civil day, including across the spring change', () => {
    const clocks = resolveCommuteClocks({
      date: '2026-03-28',
      outboundTime: '22:00',
      returnTime: '06:00',
      returnNextDay: true,
    });
    expect(clocks.ok && clocks.outbound.toISOString()).toBe(
      '2026-03-28T21:00:00.000Z',
    );
    expect(clocks.ok && clocks.returnAt.toISOString()).toBe(
      '2026-03-29T04:00:00.000Z',
    );
    expect(clocks.ok && clocks.returnDate).toBe('2026-03-29');
    expect(addCivilDays('2026-03-28', 1)).toBe('2026-03-29');
  });
});

describe('commute preparation', () => {
  it('reverses endpoints and keeps a stop between them', () => {
    const reversed = reverseWaypoints([
      { label: 'From', waypointType: 'start' },
      { label: 'Stop', waypointType: 'stop' },
      { label: 'To', waypointType: 'end' },
    ]);
    expect(reversed.map((point) => point.label)).toEqual([
      'To',
      'Stop',
      'From',
    ]);
    expect(reversed[0].waypointType).toBe('start');
    expect(reversed[2].waypointType).toBe('end');
  });

  it('packs rain gear once and keeps a return liner as an adjustment', () => {
    const shell = item({
      slot: 'shell',
      garmentId: 'jacket',
      garmentName: 'Jacket',
      configuration: [{ code: 'VENTS_OPEN' }],
    });
    const prepared = composeCommutePreparation(
      { wear: [shell], pack: [] },
      {
        wear: [
          item({
            slot: 'shell',
            garmentId: 'jacket',
            garmentName: 'Jacket',
            configuration: [{ code: 'INSTALL_THERMAL_LINER' }],
          }),
        ],
        pack: [
          item({
            mode: 'pack',
            slot: 'rain',
            garmentId: 'rain',
            garmentName: 'Rain suit',
          }),
        ],
      },
    );
    expect(prepared.wear.map((entry) => entry.garmentId)).toEqual(['jacket']);
    expect(prepared.pack.map((entry) => entry.garmentId)).toEqual(['rain']);
    expect(prepared.returnAdjustments[0]?.configuration[0]?.code).toBe(
      'INSTALL_THERMAL_LINER',
    );
    expect(
      [...prepared.wear, ...prepared.pack].filter(
        (entry) => entry.garmentId === 'jacket',
      ),
    ).toHaveLength(1);
  });

  it('does not claim a rainy return when that forecast is missing', () => {
    expect(
      commuteDifferenceCodes(weather(12, 0, 5), weather(4, 2, 80)),
    ).toEqual(['DRY_MORNING_RAIN_RETURN', 'WARM_OUTBOUND_COLD_RETURN']);
    expect(commuteDifferenceCodes(weather(12, 0, 5), null)).toEqual([]);
    expect(
      commuteDifferenceCodes(weather(12, 1, 70), weather(11, 1, 70)),
    ).toEqual([]);
  });
});
