import axios from 'axios';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import {
  MET_FAILURE_LOGS,
  WeatherService,
  minimizeMetSeries,
  persistedWeatherPoint,
} from './weather.service';

jest.mock('axios');

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

function service(provider: string): {
  weather: WeatherService;
  upsert: jest.Mock;
} {
  const upsert = jest.fn().mockResolvedValue({});
  const prisma = {
    weatherCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert,
    },
  };
  const config = {
    get: (key: string, fallback?: string) =>
      key === 'WEATHER_PROVIDER' ? provider : fallback,
  };
  return {
    weather: new WeatherService(
      config as ConfigService,
      prisma as unknown as PrismaService,
    ),
    upsert,
  };
}

describe('WeatherService altitude', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('passes altitude to MET and still selects the ETA timeseries', async () => {
    mockedGet.mockResolvedValue({
      data: {
        properties: {
          timeseries: [
            {
              time: '2026-10-02T10:00:00Z',
              data: {
                instant: { details: { air_temperature: 1, wind_speed: 1 } },
                next_1_hours: {
                  details: {
                    probability_of_precipitation: 0,
                    precipitation_amount: 0,
                  },
                },
              },
            },
            {
              time: '2026-10-02T12:00:00Z',
              data: {
                instant: { details: { air_temperature: 9, wind_speed: 3 } },
                next_1_hours: {
                  details: {
                    probability_of_precipitation: 20,
                    precipitation_amount: 0.2,
                  },
                  summary: { symbol_code: 'fair_day' },
                },
              },
            },
          ],
        },
      },
    });
    const { weather, upsert } = service('met');
    const at = new Date('2026-10-02T12:10:00Z');
    const summary = await weather.forRouteSamples([
      { lat: 60.5, lon: 8, at, altitudeM: 987.25 },
    ]);

    expect(mockedGet).toHaveBeenCalledWith(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.5&lon=8&altitude=987',
      expect.any(Object),
    );
    expect(summary.points[0].airTempC).toBe(9);
    expect(summary.points[0].forecastAt).toBe(at.toISOString());
    expect(summary.points[0].groundElevationM).toBe(987);
    expect(upsert.mock.calls[0][0].where.cacheKey).toBe(
      'met:60.500,8.000@987m@2026-10-02T12',
    );
  });

  it('keeps the lat/lon MET request when elevation is unknown', async () => {
    mockedGet.mockResolvedValue({
      data: {
        properties: {
          timeseries: [
            {
              time: '2026-10-02T10:00:00Z',
              data: {
                instant: { details: { air_temperature: 4, wind_speed: 2 } },
                next_1_hours: { details: {} },
              },
            },
          ],
        },
      },
    });
    const { weather } = service('met');
    const summary = await weather.forRouteSamples([
      { lat: 59.91, lon: 10.75, altitudeM: null },
    ]);
    expect(mockedGet).toHaveBeenCalledWith(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75',
      expect.any(Object),
    );
    expect(summary.points[0].groundElevationM).toBeUndefined();
    expect(summary.points[0].airTempC).toBe(4);
  });

  it('uses the failure forecast when MET returns no temperature', async () => {
    const place = { lat: 59.91, lon: 10.75, altitudeM: 40 };
    mockedGet.mockResolvedValueOnce({
      data: { properties: { timeseries: [] } },
    });
    const { weather, upsert } = service('met');
    const empty = await weather.forRouteSamples([place]);

    mockedGet.mockResolvedValueOnce({ data: {} });
    const missing = await weather.forRouteSamples([
      { lat: 60.1, lon: 9.2, altitudeM: 12 },
    ]);

    mockedGet.mockRejectedValueOnce(new Error('met down'));
    const failed = await weather.forRouteSamples([place]);

    expect(empty.points[0].airTempC).toBe(failed.points[0].airTempC);
    expect(empty.points[0].windSpeedMs).toBe(failed.points[0].windSpeedMs);
    expect(empty.points[0].groundElevationM).toBe(40);
    expect(missing.points[0].groundElevationM).toBe(12);
    expect(missing.points[0].windSpeedMs).toBeGreaterThanOrEqual(2);
    const cached = JSON.parse(
      String(upsert.mock.calls[0][0].create.payloadJson),
    ) as { airTempC: number };
    expect(cached.airTempC).toBe(empty.points[0].airTempC);
    expect(cached.airTempC).not.toBe(0);
  });

  it('keeps a real MET temperature of zero', async () => {
    mockedGet.mockResolvedValue({
      data: {
        properties: {
          timeseries: [
            {
              time: '2026-10-02T10:00:00Z',
              data: {
                instant: { details: { air_temperature: 0, wind_speed: 7 } },
                next_1_hours: {
                  details: {
                    probability_of_precipitation: 10,
                    precipitation_amount: 0,
                  },
                },
              },
            },
          ],
        },
      },
    });
    const { weather } = service('met');
    const summary = await weather.forRouteSamples([
      { lat: 59.91, lon: 10.75, altitudeM: 40 },
    ]);
    expect(summary.points[0].airTempC).toBe(0);
    expect(summary.points[0].windSpeedMs).toBe(7);
    expect(summary.points[0].precipitationProbPct).toBe(10);
    expect(summary.points[0].groundElevationM).toBe(40);
  });

  it('starts independent route sample MET requests concurrently and preserves route order', async () => {
    const releases: Array<() => void> = [];
    mockedGet.mockImplementation(
      (url) =>
        new Promise((resolve) => {
          const parsed = new URL(String(url));
          const lat = Number(parsed.searchParams.get('lat'));
          releases.push(() =>
            resolve({
              data: {
                properties: {
                  timeseries: [
                    {
                      time: '2026-10-03T12:00:00Z',
                      data: {
                        instant: {
                          details: { air_temperature: lat, wind_speed: 2 },
                        },
                        next_1_hours: { details: {} },
                      },
                    },
                  ],
                },
              },
            }),
          );
        }) as ReturnType<typeof axios.get>,
    );

    const { weather } = service('met');
    const pending = weather.forRouteSamples([
      { lat: 58, lon: 8, at: new Date('2026-10-03T12:00:00Z') },
      { lat: 59, lon: 9, at: new Date('2026-10-03T12:10:00Z') },
      { lat: 60, lon: 10, at: new Date('2026-10-03T12:20:00Z') },
    ]);

    // Flush the cache lookup continuations. Before the optimization only the
    // first provider request could be in flight at this point.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockedGet).toHaveBeenCalledTimes(3);

    for (const release of releases) release();
    const summary = await pending;
    expect(summary.points.map((point) => point.airTempC)).toEqual([58, 59, 60]);
  });

  it('still returns a forecast when MET fails', async () => {
    mockedGet.mockRejectedValue(new Error('met down'));
    const { weather } = service('met');
    const summary = await weather.forRouteSamples([
      { lat: 59.91, lon: 10.75, altitudeM: 40 },
    ]);
    expect(summary.points).toHaveLength(1);
    expect(summary.points[0].groundElevationM).toBe(40);
    expect(Number.isFinite(summary.points[0].airTempC)).toBe(true);
  });
});

describe('WeatherService departure comparison', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  function series(
    hours: Array<{
      time: string;
      temp: number;
      rain?: number;
      wind?: number;
      precip?: number;
    }>,
  ) {
    return {
      data: {
        properties: {
          timeseries: hours.map((hour) => ({
            time: hour.time,
            data: {
              instant: {
                details: {
                  air_temperature: hour.temp,
                  wind_speed: hour.wind ?? 2,
                },
              },
              next_1_hours: {
                details: {
                  probability_of_precipitation: hour.rain ?? 0,
                  precipitation_amount: hour.precip ?? 0,
                },
              },
            },
          })),
        },
      },
    };
  }

  it('fetches each place once and leaves an out-of-range departure without invented numbers', async () => {
    mockedGet.mockResolvedValue(
      series([
        { time: '2026-10-03T14:00:00Z', temp: 4, rain: 10, wind: 3, precip: 0 },
        {
          time: '2026-10-03T15:00:00Z',
          temp: 6,
          rain: 20,
          wind: 4,
          precip: 0.2,
        },
        {
          time: '2026-10-03T16:00:00Z',
          temp: 5,
          rain: 80,
          wind: 7,
          precip: 1.4,
        },
        {
          time: '2026-10-03T17:00:00Z',
          temp: 3,
          rain: 30,
          wind: 5,
          precip: 0.4,
        },
      ]),
    );
    const { weather, upsert } = service('met');
    const place = { lat: 60.5, lon: 8.25, altitudeM: 120 };
    const rows = await weather.compareSampleGroups([
      [{ ...place, at: new Date('2026-10-03T14:00:00Z') }],
      [{ ...place, at: new Date('2026-10-03T15:00:00Z') }],
      [{ ...place, at: new Date('2026-10-03T16:00:00Z') }],
      [{ ...place, at: new Date('2026-10-05T15:00:00Z') }],
    ]);

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(4);
    expect(rows[0].available).toBe(true);
    expect(rows[0].conditions).toMatchObject({
      minTempC: 4,
      maxTempC: 4,
      maxRainProbPct: 10,
      maxPrecipMm: 0,
      maxWindMs: 3,
      forecastFrom: '2026-10-03T14:00:00.000Z',
      forecastTo: '2026-10-03T14:00:00.000Z',
    });
    expect(rows[2].conditions?.maxPrecipMm).toBe(1.4);
    expect(rows[3].available).toBe(false);
    expect(rows[3].unavailableReason).toBe('out_of_range');
    expect(rows[3].conditions).toBeUndefined();
    expect(JSON.stringify(rows)).not.toMatch(/score|best|rank/i);
    const keys = upsert.mock.calls.map(
      (call) => call[0].where.cacheKey as string,
    );
    expect(keys).toContain('series:met:60.500,8.250@120m');
    expect(keys).toContain('met:60.500,8.250@120m@2026-10-03T15');
    expect(keys.some((key) => key.includes('2026-10-05'))).toBe(false);
  });

  it('reuses a stored series for a second comparison', async () => {
    const payload = series([
      { time: '2026-10-03T15:00:00Z', temp: 1, rain: 0, wind: 1 },
    ]).data.properties.timeseries;
    const findUnique = jest.fn(({ where }: { where: { cacheKey: string } }) => {
      if (where.cacheKey !== 'series:met:59.910,10.750') return null;
      return {
        cacheKey: where.cacheKey,
        payloadJson: JSON.stringify(payload),
        validUntil: new Date(Date.now() + 60_000),
      };
    });
    const prisma = {
      weatherCache: {
        findUnique,
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const weather = new WeatherService(
      {
        get: (key: string, fallback?: string) =>
          key === 'WEATHER_PROVIDER' ? 'met' : fallback,
      } as ConfigService,
      prisma as unknown as PrismaService,
    );
    const rows = await weather.compareSampleGroups([
      [{ lat: 59.91, lon: 10.75, at: new Date('2026-10-03T15:10:00Z') }],
    ]);
    expect(mockedGet).not.toHaveBeenCalled();
    expect(rows[0].conditions?.minTempC).toBe(1);
    expect(rows[0].conditions?.forecastFrom).toBe('2026-10-03T15:00:00.000Z');
  });

  it('does not call MET for the mock provider and does not pretend the hours differ', async () => {
    const { weather } = service('mock');
    const rows = await weather.compareSampleGroups([
      [{ lat: 59.91, lon: 10.75, at: new Date('2026-10-03T15:00:00Z') }],
      [{ lat: 59.91, lon: 10.75, at: new Date('2026-10-03T16:00:00Z') }],
    ]);
    expect(mockedGet).not.toHaveBeenCalled();
    expect(rows[0].variesByTime).toBe(false);
    expect(rows[1].variesByTime).toBe(false);
    expect(rows[0].conditions?.minTempC).toBe(rows[1].conditions?.minTempC);
  });

  it('does not put coordinates in MET failure logs', () => {
    for (const message of Object.values(MET_FAILURE_LOGS)) {
      expect(message).not.toMatch(/\d/);
      expect(message).not.toContain(',');
    }
  });

  it('returns the caller coordinate from a shared cache row', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      cacheKey: 'met:59.914,10.752',
      payloadJson: JSON.stringify({
        lat: 59.913946,
        lon: 10.752214,
        airTempC: 4,
        precipitationProbPct: 1,
        precipitationMm: 0,
        windSpeedMs: 2,
      }),
      validUntil: new Date(Date.now() + 60_000),
    });
    const weather = new WeatherService(
      {
        get: (key: string, fallback?: string) =>
          key === 'WEATHER_PROVIDER' ? 'met' : fallback,
      } as ConfigService,
      {
        weatherCache: { findUnique, upsert: jest.fn(), deleteMany: jest.fn() },
      } as unknown as PrismaService,
    );
    const summary = await weather.forRouteSamples([
      { lat: 59.9135, lon: 10.7524 },
    ]);
    expect(summary.points[0].lat).toBe(59.9135);
    expect(summary.points[0].lon).toBe(10.7524);
    expect(summary.points[0].airTempC).toBe(4);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('persists cache-key coordinates and only the MET fields the forecast reads', async () => {
    mockedGet.mockResolvedValue({
      data: {
        properties: {
          timeseries: [
            {
              time: '2026-10-06T12:00:00Z',
              data: {
                instant: {
                  details: {
                    air_temperature: 3,
                    wind_speed: 5,
                    air_pressure_at_sea_level: 1000,
                    relative_humidity: 80,
                    wind_from_direction: 180,
                  },
                },
                next_1_hours: {
                  details: {
                    probability_of_precipitation: 15,
                    precipitation_amount: 0.4,
                    probability_of_thunder: 2,
                  },
                  summary: { symbol_code: 'lightrain' },
                },
              },
            },
          ],
        },
      },
    });
    const { weather, upsert } = service('met');
    await weather.compareSampleGroups([
      [
        {
          lat: 59.913946,
          lon: 10.752214,
          at: new Date('2026-10-06T12:10:00Z'),
        },
      ],
    ]);
    const storedSeries = JSON.parse(
      String(
        upsert.mock.calls.find((call) =>
          String(call[0].where.cacheKey).startsWith('series:'),
        )?.[0].create.payloadJson,
      ),
    );
    const storedText = JSON.stringify(storedSeries);
    expect(storedText).not.toContain('relative_humidity');
    expect(storedText).not.toContain('air_pressure');
    expect(storedText).not.toContain('wind_from_direction');
    expect(storedText).not.toContain('probability_of_thunder');
    expect(storedSeries[0].data.instant.details.air_temperature).toBe(3);
    expect(storedSeries[0].data.next_1_hours.summary.symbol_code).toBe(
      'lightrain',
    );

    const storedPoint = JSON.parse(
      String(
        upsert.mock.calls.find((call) =>
          String(call[0].where.cacheKey).startsWith('met:'),
        )?.[0].create.payloadJson,
      ),
    ) as { lat: number; lon: number };
    expect(storedPoint).toEqual(
      persistedWeatherPoint({
        lat: 59.913946,
        lon: 10.752214,
        airTempC: 3,
        precipitationProbPct: 15,
        precipitationMm: 0.4,
        windSpeedMs: 5,
        symbol: 'lightrain',
      }),
    );
    expect(storedPoint.lat).toBe(59.914);
    expect(storedPoint.lon).toBe(10.752);
  });

  it('drops unused MET fields without changing the values that are kept', () => {
    const minimized = minimizeMetSeries([
      {
        time: '2026-10-06T12:00:00Z',
        data: {
          instant: {
            details: { air_temperature: 0, wind_speed: 1, cloud_area_fraction: 9 },
          },
        },
      },
    ]);
    expect(minimized[0].data?.instant?.details?.air_temperature).toBe(0);
    expect(JSON.stringify(minimized)).not.toContain('cloud_area_fraction');
  });
});
