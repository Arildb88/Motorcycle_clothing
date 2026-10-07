import axios from 'axios';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { weatherCacheKey } from '../weather/met-request';
import type { ElevationLookup } from './elevation.port';
import {
  BoundedElevationCache,
  KartverketElevationAdapter,
  elevationCacheKey,
  type ElevationHttpGet,
} from './kartverket-elevation.adapter';
import { lookupSampleAltitudes } from './lookup-sample-altitudes';
import { NullElevationAdapter } from './null-elevation.adapter';

jest.mock('axios');

/**
 * Kartverket ground height -> MET `altitude`.
 * Bodies below are fixtures. They do not measure forecast accuracy.
 */

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

const at = new Date('2026-10-02T12:10:00Z');

function createWeather(provider = 'met'): {
  weather: WeatherService;
  upsert: jest.Mock;
  findUnique: jest.Mock;
} {
  const upsert = jest.fn().mockResolvedValue({});
  const findUnique = jest.fn().mockResolvedValue(null);
  const prisma = {
    weatherCache: {
      findUnique,
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert,
    },
  };
  const config = {
    get: (key: string, fallback?: string) => {
      if (key === 'WEATHER_PROVIDER') return provider;
      if (key === 'MET_USER_AGENT') {
        return 'RideWearTest/1.0 (https://github.com/Arildb88/Motorcycle_clothing)';
      }
      return fallback;
    },
  };
  return {
    weather: new WeatherService(
      config as ConfigService,
      prisma as unknown as PrismaService,
    ),
    upsert,
    findUnique,
  };
}

function installMetFixture(): void {
  mockedGet.mockImplementation(async () => ({
    data: {
      properties: {
        timeseries: [
          {
            time: '2026-10-02T12:00:00Z',
            data: {
              instant: { details: { air_temperature: 1, wind_speed: 2 } },
              next_1_hours: {
                details: {
                  probability_of_precipitation: 0,
                  precipitation_amount: 0,
                },
              },
            },
          },
        ],
      },
    },
  }));
}

function metUrls(): string[] {
  return mockedGet.mock.calls.map((call) => String(call[0]));
}

function altitudeOf(url: string): string | null {
  return new URL(url).searchParams.get('altitude');
}

/**
 * Same handoff RecommendService uses: one height per sample index, null when
 * that sample has no finite elevation.
 */
async function forecastFromLookup(
  weather: WeatherService,
  lookup: ElevationLookup,
  samples: Array<{ lat: number; lon: number; at?: Date }>,
) {
  return weather.forRouteSamples(
    samples.map((sample, index) => ({
      lat: sample.lat,
      lon: sample.lon,
      at: sample.at,
      altitudeM: lookup.points[index]?.elevationM ?? null,
    })),
  );
}

function requestedPairs(url: string): number[][] {
  return JSON.parse(
    new URL(url).searchParams.get('punkter') ?? '[]',
  ) as number[][];
}

describe('altitude-aware weather', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    installMetFixture();
  });

  it('sends low, sea-level, and high whole metres, and omits altitude when elevation is missing', async () => {
    const belowSea = { lat: 59.2, lon: 5.3 };
    const shore = { lat: 58.97, lon: 5.73 };
    const coast = { lat: 59.913946, lon: 10.752214 };
    const summit = { lat: 61.63647, lon: 8.31234 };
    const unknown = { lat: 62.1, lon: 7.2 };
    const heights = new Map<string, number | 'missing'>([
      ['59.2,5.3', -1.2],
      ['58.97,5.73', 0],
      ['59.91395,10.75221', 1.6],
      ['61.63647,8.31234', 2469.6],
      ['62.1,7.2', 'missing'],
    ]);
    const urls: string[] = [];
    const get: ElevationHttpGet = async (url) => {
      urls.push(url);
      const punkter = requestedPairs(url);
      return {
        status: 200,
        data: {
          punkter: punkter.map(([lon, lat]) => {
            const height = heights.get(`${lat},${lon}`);
            if (height === 'missing' || height === undefined) return {};
            return { z: height };
          }),
        },
      };
    };
    const adapter = new KartverketElevationAdapter({ get });
    const samples = [belowSea, shore, coast, summit, unknown];
    const lookup = await lookupSampleAltitudes(adapter, samples);

    expect(urls).toHaveLength(1);
    expect(requestedPairs(urls[0])).toEqual([
      [5.3, 59.2],
      [5.73, 58.97],
      [10.75221, 59.91395],
      [8.31234, 61.63647],
      [7.2, 62.1],
    ]);
    expect(lookup.points.map((point) => point.elevationM)).toEqual([
      -1,
      0,
      2,
      2470,
      null,
    ]);
    expect(lookup.provider).toBe('kartverket');
    expect(lookup.attribution).toBe('© Kartverket');
    expect(elevationCacheKey(coast)).toBe('59.9139,10.7522');

    const { weather, upsert } = createWeather();
    const summary = await forecastFromLookup(
      weather,
      lookup,
      samples.map((sample) => ({ ...sample, at })),
    );

    expect(metUrls().map(altitudeOf)).toEqual(['-1', '0', '2', '2470', null]);
    expect(metUrls()[2]).toContain('lat=59.913946');
    expect(metUrls()[2]).toContain('lon=10.752214');
    expect(summary.points.map((point) => point.groundElevationM)).toEqual([
      -1,
      0,
      2,
      2470,
      undefined,
    ]);
    expect(summary.points.every((point) => point.airTempC === 1)).toBe(true);
    const pointKeys = upsert.mock.calls
      .map((call) => call[0].where.cacheKey as string)
      .filter((key) => !key.includes(':series:'));
    expect(pointKeys).toEqual([
      weatherCacheKey({
        provider: 'met',
        ...belowSea,
        at,
        altitudeM: -1,
      }),
      weatherCacheKey({ provider: 'met', ...shore, at, altitudeM: 0 }),
      weatherCacheKey({ provider: 'met', ...coast, at, altitudeM: 2 }),
      weatherCacheKey({ provider: 'met', ...summit, at, altitudeM: 2470 }),
      weatherCacheKey({ provider: 'met', ...unknown, at, altitudeM: null }),
    ]);
    expect(pointKeys[2]).toBe('wx2:met:59.914,10.752@2m@2026-10-02T12');
    expect(pointKeys[4]).toBe('wx2:met:62.100,7.200@2026-10-02T12');
  });

  it('reuses a four-decimal elevation cache hit and still requests MET with that sample coordinate', async () => {
    const first = { lat: 59.91394, lon: 10.75221 };
    const nearby = { lat: 59.91391, lon: 10.75224 };
    expect(elevationCacheKey(first)).toBe('59.9139,10.7522');
    expect(elevationCacheKey(nearby)).toBe(elevationCacheKey(first));

    let calls = 0;
    const urls: string[] = [];
    const get: ElevationHttpGet = async (url) => {
      calls += 1;
      urls.push(url);
      const punkter = requestedPairs(url);
      return {
        status: 200,
        data: { punkter: punkter.map((_, index) => ({ z: 12.2 + index })) },
      };
    };
    const cache = new BoundedElevationCache();
    const adapter = new KartverketElevationAdapter({ get, cache });
    const both = await lookupSampleAltitudes(adapter, [first, nearby]);
    expect(calls).toBe(1);
    expect(requestedPairs(urls[0])).toEqual([
      [10.75221, 59.91394],
      [10.75224, 59.91391],
    ]);
    expect(both.points.map((point) => point.elevationM)).toEqual([12, 13]);

    calls = 0;
    const again = await lookupSampleAltitudes(adapter, [nearby]);
    expect(calls).toBe(0);
    expect(again.points[0].elevationM).toBe(13);
    expect(cache.size).toBe(1);

    const { weather } = createWeather();
    await forecastFromLookup(weather, again, [{ ...nearby, at }]);
    expect(metUrls()).toEqual([
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91391&lon=10.75224&altitude=13',
    ]);
  });

  it('does not cache a failed chunk, and a later success fills only that chunk', async () => {
    let calls = 0;
    const get: ElevationHttpGet = async (url) => {
      calls += 1;
      const punkter = requestedPairs(url);
      if (calls === 2) throw new Error('chunk down');
      if (punkter.length === 1) {
        return { status: 200, data: { punkter: [{ z: 88.6 }] } };
      }
      expect(punkter).toHaveLength(50);
      return {
        status: 200,
        data: { punkter: punkter.map(() => ({ z: 40.2 })) },
      };
    };
    const adapter = new KartverketElevationAdapter({ get });
    const points = Array.from({ length: 51 }, (_, index) => ({
      lat: 59 + index * 0.02,
      lon: 10,
    }));
    const lookup = await lookupSampleAltitudes(adapter, points);
    expect(lookup.provider).toBe('kartverket');
    expect(lookup.attribution).toBe('© Kartverket');
    expect(
      lookup.points.slice(0, 50).every((point) => point.elevationM === 40),
    ).toBe(true);
    expect(lookup.points[50].elevationM).toBeNull();

    const { weather } = createWeather();
    const summary = await forecastFromLookup(
      weather,
      {
        provider: lookup.provider,
        attribution: lookup.attribution,
        points: [lookup.points[0], lookup.points[50]],
      },
      [
        { ...points[0], at },
        { ...points[50], at },
      ],
    );
    expect(metUrls().map(altitudeOf)).toEqual(['40', null]);
    expect(summary.points.map((point) => point.groundElevationM)).toEqual([
      40,
      undefined,
    ]);

    const retry = await adapter.groundElevations([points[0], points[50]]);
    expect(calls).toBe(3);
    expect(retry.points.map((point) => point.elevationM)).toEqual([40, 89]);
  });

  it('does not cache an unusable Kartverket response, and MET gets no altitude', async () => {
    const samples = [
      { lat: 60.1, lon: 8.1 },
      { lat: 60.2, lon: 8.2 },
    ];
    const responders: Array<
      (url: string) => Promise<{ status: number; data: unknown }>
    > = [
      async () => ({
        status: 200,
        data: { punkter: [{ z: Number.NaN }, { z: '12' }] },
      }),
      async () => ({
        status: 200,
        data: { punkter: [{ z: 10 }] },
      }),
      async () => {
        throw new Error('down');
      },
      async () => ({ status: 503, data: { punkter: [{ z: 10 }, { z: 11 }] } }),
    ];

    for (const respond of responders) {
      let calls = 0;
      const get: ElevationHttpGet = async (url) => {
        calls += 1;
        return respond(url);
      };
      const adapter = new KartverketElevationAdapter({ get });
      const lookup = await lookupSampleAltitudes(adapter, samples);
      expect(lookup.provider).toBe('none');
      expect(lookup.attribution).toBeNull();
      expect(lookup.points.map((point) => point.elevationM)).toEqual([
        null,
        null,
      ]);
      expect(calls).toBe(1);

      mockedGet.mockClear();
      const { weather } = createWeather();
      const summary = await forecastFromLookup(
        weather,
        lookup,
        samples.map((sample) => ({ ...sample, at })),
      );
      expect(metUrls().map(altitudeOf)).toEqual([null, null]);
      expect(summary.points.map((point) => point.groundElevationM)).toEqual([
        undefined,
        undefined,
      ]);

      const retry = await adapter.groundElevations(samples);
      expect(calls).toBe(2);
      expect(retry.points.map((point) => point.elevationM)).toEqual([
        null,
        null,
      ]);
    }
  });

  it('skips non-finite coordinates and does not invent a height for them', async () => {
    let requested = 0;
    const get: ElevationHttpGet = async (url) => {
      requested += 1;
      expect(requestedPairs(url)).toEqual([[8, 60.5]]);
      return { status: 200, data: { punkter: [{ z: 900.4 }] } };
    };
    const adapter = new KartverketElevationAdapter({ get });
    const samples = [
      { lat: Number.NaN, lon: 10 },
      { lat: 60.5, lon: 8 },
    ];
    const lookup = await lookupSampleAltitudes(adapter, samples);
    expect(requested).toBe(1);
    expect(lookup.points.map((point) => point.elevationM)).toEqual([null, 900]);

    const { weather } = createWeather();
    await forecastFromLookup(
      weather,
      lookup,
      samples.map((sample) => ({ ...sample, at })),
    );
    expect(altitudeOf(metUrls()[0])).toBeNull();
    expect(altitudeOf(metUrls()[1])).toBe('900');
    expect(metUrls()[1]).toContain('lat=60.5');
    expect(metUrls()[1]).toContain('lon=8');
  });

  it('drops the oldest cached height when the elevation cache is full', async () => {
    const cache = new BoundedElevationCache(1);
    let calls = 0;
    const get: ElevationHttpGet = async (url) => {
      calls += 1;
      const [lon, lat] = requestedPairs(url)[0];
      return { status: 200, data: { punkter: [{ z: lat + lon }] } };
    };
    const adapter = new KartverketElevationAdapter({ get, cache });
    const low = { lat: 59.91, lon: 10.75 };
    const high = { lat: 61.64, lon: 8.31 };
    await adapter.groundElevations([low]);
    await adapter.groundElevations([high]);
    expect(cache.size).toBe(1);
    calls = 0;
    const again = await adapter.groundElevations([low, high]);
    expect(calls).toBe(1);
    expect(again.points[1].elevationM).toBe(Math.round(61.64 + 8.31));
    expect(again.points[0].elevationM).toBe(Math.round(59.91 + 10.75));
  });

  it('uses a fresh altitude-specific weather cache entry and refetches when it is stale or for another height', async () => {
    const place = { lat: 60.5, lon: 8, at };
    const lowKey = weatherCacheKey({
      provider: 'met',
      ...place,
      altitudeM: 12,
    });
    const highKey = weatherCacheKey({
      provider: 'met',
      ...place,
      altitudeM: 2470,
    });
    expect(lowKey).not.toBe(highKey);

    const { weather, findUnique, upsert } = createWeather();
    findUnique.mockImplementation(async ({ where: { cacheKey } }) => {
      if (cacheKey !== lowKey) return null;
      return {
        cacheKey,
        payloadJson: JSON.stringify({
          lat: place.lat,
          lon: place.lon,
          airTempC: 4,
          precipitationProbPct: 0,
          precipitationMm: 0,
          windSpeedMs: 1,
          groundElevationM: 12,
          source: 'met',
          forecastValidAt: '2026-10-02T12:00:00.000Z',
        }),
        validUntil: new Date(Date.now() + 60_000),
      };
    });

    const fresh = await weather.forRouteSamples([
      { ...place, altitudeM: 12 },
      { ...place, altitudeM: 2470 },
    ]);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(altitudeOf(metUrls()[0])).toBe('2470');
    expect(fresh.points[0].airTempC).toBe(4);
    expect(fresh.points[0].groundElevationM).toBe(12);
    expect(fresh.points[1].groundElevationM).toBe(2470);
    const freshPointKeys = upsert.mock.calls
      .map((call) => call[0].where.cacheKey as string)
      .filter((key) => !key.includes(':series:'));
    expect(freshPointKeys).toEqual([highKey]);

    mockedGet.mockClear();
    upsert.mockClear();
    findUnique.mockResolvedValue({
      cacheKey: lowKey,
      payloadJson: JSON.stringify({
        lat: place.lat,
        lon: place.lon,
        airTempC: 4,
        precipitationProbPct: 0,
        precipitationMm: 0,
        windSpeedMs: 1,
        groundElevationM: 12,
      }),
      validUntil: new Date(Date.now() - 1_000),
    });
    const stale = await weather.forRouteSamples([{ ...place, altitudeM: 12 }]);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(altitudeOf(metUrls()[0])).toBe('12');
    expect(stale.points[0].groundElevationM).toBe(12);
    expect(
      upsert.mock.calls
        .map((call) => call[0].where.cacheKey as string)
        .filter((key) => !key.includes(':series:')),
    ).toEqual([lowKey]);
  });

  it('keeps a known height when MET fails, and does not invent one when elevation is unknown', async () => {
    mockedGet.mockRejectedValue(new Error('met down'));
    const { weather } = createWeather();
    const summary = await weather.forRouteSamples([
      { lat: 59.91, lon: 10.75, at, altitudeM: 2 },
      { lat: 61.64, lon: 8.31, at, altitudeM: null },
      { lat: 60, lon: 9, at, altitudeM: Number.NaN },
      { lat: 60, lon: 9.1, at, altitudeM: Number.POSITIVE_INFINITY },
    ]);
    expect(summary.status).toBe('unavailable');
    expect(summary.points).toEqual([]);
    expect(summary.source).toBeUndefined();
    expect(metUrls().map(altitudeOf)).toEqual(['2', null, null, null]);
  });

  it('does not call MET or invent weather when the provider is mock', async () => {
    const { weather } = createWeather('mock');
    const summary = await weather.forRouteSamples([
      { lat: 59.91, lon: 10.75, altitudeM: 2.4 },
      { lat: 60.5, lon: 8, altitudeM: null },
    ]);
    expect(mockedGet).not.toHaveBeenCalled();
    expect(summary.status).toBe('unavailable');
    expect(summary.reason).toBe('configuration');
    expect(summary.points).toEqual([]);
  });

  it('omits MET altitude when the elevation adapter is the null fallback', async () => {
    const samples = [
      { lat: 59.91, lon: 10.75 },
      { lat: 61.64, lon: 8.31 },
    ];
    const lookup = await lookupSampleAltitudes(
      new NullElevationAdapter(),
      samples,
    );
    expect(lookup).toEqual({
      provider: 'none',
      attribution: null,
      points: samples.map((sample) => ({ ...sample, elevationM: null })),
    });
    const { weather } = createWeather();
    const summary = await forecastFromLookup(
      weather,
      lookup,
      samples.map((sample) => ({ ...sample, at })),
    );
    expect(metUrls().map(altitudeOf)).toEqual([null, null]);
    expect(
      summary.points.every((point) => point.groundElevationM === undefined),
    ).toBe(true);
  });
});
