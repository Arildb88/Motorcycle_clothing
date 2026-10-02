import axios from 'axios';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from './weather.service';

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
