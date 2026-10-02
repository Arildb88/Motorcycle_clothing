import { MAX_ROUTE_WEATHER_SAMPLES } from '../../routing/route-weather-sampling';
import { haversineMetres, leadMatchesBucket, truncateLat } from './shape';
import { runWeatherValidation } from './harness';
import type {
  ForecastReading,
  FrozenCase,
  ObservationReading,
  ProviderTerms,
} from './types';

const VALID = '2026-03-01T11:00:00.000Z';
const FETCHED = '2026-03-01T10:00:00.000Z';

function frozenCase(
  overrides: Partial<FrozenCase> & { caseId: string },
): FrozenCase {
  return {
    lat: 60,
    lon: 10,
    elevationM: 120,
    validTimeUtc: VALID,
    leadBucket: 'h1',
    stratum: 'coast',
    site: 'station',
    ...overrides,
  };
}

function forecast(
  overrides: Partial<ForecastReading> & { caseId: string; providerId: string },
): ForecastReading {
  return {
    lat: 60,
    lon: 10,
    elevationM: 120,
    elevationSent: true,
    validTimeUtc: VALID,
    fetchedAt: FETCHED,
    airTempC: 5,
    temperatureHeightM: 2,
    windSpeedMs: 4,
    windHeightM: 10,
    precipitationMm: 0,
    precipitationStepHours: 1,
    precipitationProbPct: 10,
    returnedForecast: true,
    latencyMs: 80,
    ...overrides,
  };
}

function observation(
  overrides: Partial<ObservationReading> & { caseId: string },
): ObservationReading {
  return {
    lat: 60,
    lon: 10,
    elevationM: 120,
    validTimeUtc: VALID,
    airTempC: 4,
    temperatureHeightM: 2,
    windSpeedMs: 3,
    windHeightM: 10,
    precipitationMm: 0,
    ...overrides,
  };
}

function stratumOf(
  report: ReturnType<typeof runWeatherValidation>,
  providerId: string,
  stratum: FrozenCase['stratum'],
) {
  const provider = report.providers.find(
    (row) => row.providerId === providerId,
  );
  const measured = provider?.strata.find((row) => row.stratum === stratum);
  if (!measured) throw new Error(`missing ${providerId} ${stratum}`);
  return measured;
}

describe('weather validation pair shape', () => {
  it('truncates coordinates toward zero at 4 decimals', () => {
    expect(truncateLat(59.91396)).toBe(59.9139);
    expect(truncateLat(59.91394)).toBe(59.9139);
    expect(truncateLat(-10.75229)).toBe(-10.7522);
  });

  it('keeps h1 and h6 inside inclusive lead bounds and drops the outside minute', () => {
    const fetched = '2026-03-01T10:00:00.000Z';
    expect(leadMatchesBucket('h1', '2026-03-01T10:30:00.000Z', fetched)).toBe(
      true,
    );
    expect(leadMatchesBucket('h1', '2026-03-01T11:30:00.000Z', fetched)).toBe(
      true,
    );
    expect(leadMatchesBucket('h1', '2026-03-01T10:29:00.000Z', fetched)).toBe(
      false,
    );
    expect(leadMatchesBucket('h1', '2026-03-01T11:31:00.000Z', fetched)).toBe(
      false,
    );
    expect(leadMatchesBucket('h6', '2026-03-01T15:00:00.000Z', fetched)).toBe(
      true,
    );
    expect(leadMatchesBucket('h6', '2026-03-01T17:00:00.000Z', fetched)).toBe(
      true,
    );
    expect(leadMatchesBucket('h6', '2026-03-01T14:59:59.000Z', fetched)).toBe(
      false,
    );
    expect(leadMatchesBucket('h6', '2026-03-01T17:00:01.000Z', fetched)).toBe(
      false,
    );
  });

  it('accepts next-morning only in the Oslo window on the previous civil day', () => {
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-01-15T05:00:00.000Z',
        '2026-01-14T15:00:00.000Z',
      ),
    ).toBe(true);
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-01-15T08:00:00.000Z',
        '2026-01-14T19:00:00.000Z',
      ),
    ).toBe(true);
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-01-15T08:01:00.000Z',
        '2026-01-14T19:00:00.000Z',
      ),
    ).toBe(false);
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-01-15T07:00:00.000Z',
        '2026-01-14T19:01:00.000Z',
      ),
    ).toBe(false);
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-01-15T06:00:00.000Z',
        '2026-01-15T16:00:00.000Z',
      ),
    ).toBe(false);
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-07-15T04:00:00.000Z',
        '2026-07-14T14:00:00.000Z',
      ),
    ).toBe(true);
    expect(
      leadMatchesBucket(
        'next_morning',
        '2026-07-15T07:01:00.000Z',
        '2026-07-14T14:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('measures a one-degree latitude step near 111 km', () => {
    const metres = haversineMetres(60, 10, 61, 10);
    expect(metres).toBeGreaterThan(110_000);
    expect(metres).toBeLessThan(112_000);
  });
});

describe('runWeatherValidation', () => {
  it('pairs truncated coordinates and reports temperature bias against the observation', () => {
    const report = runWeatherValidation({
      cases: [frozenCase({ caseId: 'c1', lat: 59.91396, lon: 10.75224 })],
      forecasts: [
        forecast({
          caseId: 'c1',
          providerId: 'met-locationforecast',
          lat: 59.91394,
          lon: 10.75221,
          airTempC: 6,
        }),
        forecast({
          caseId: 'c1',
          providerId: 'candidate',
          lat: 59.914,
          lon: 10.75224,
          airTempC: 9,
        }),
      ],
      observations: [
        observation({
          caseId: 'c1',
          lat: 59.91396,
          lon: 10.75224,
          airTempC: 4,
        }),
      ],
    });

    const met = stratumOf(report, 'met-locationforecast', 'coast');
    expect(met.temperature).toEqual({ n: 1, mae: 2, meanBias: 2 });
    expect(met.reportable).toBe(false);
    expect(report.dropped).toEqual(
      expect.arrayContaining([
        {
          caseId: 'c1',
          providerId: 'candidate',
          reason: 'unpaired_coordinate',
        },
      ]),
    );
    expect(report.empiricalTrial).toBe(false);
    expect(report.adoption).toBe('withheld');
  });

  it('drops a lead that does not match the declared bucket instead of relabelling it', () => {
    const report = runWeatherValidation({
      cases: [frozenCase({ caseId: 'c1', leadBucket: 'h6' })],
      forecasts: [
        forecast({
          caseId: 'c1',
          providerId: 'met-locationforecast',
          fetchedAt: FETCHED,
        }),
      ],
      observations: [observation({ caseId: 'c1' })],
    });
    expect(stratumOf(report, 'met-locationforecast', 'coast').coverage.n).toBe(
      0,
    );
    expect(report.dropped).toContainEqual({
      caseId: 'c1',
      providerId: 'met-locationforecast',
      reason: 'lead_bucket',
    });
  });

  it('drops a case whose providers were fetched more than 15 minutes apart', () => {
    const report = runWeatherValidation({
      cases: [frozenCase({ caseId: 'c1' })],
      forecasts: [
        forecast({
          caseId: 'c1',
          providerId: 'met-locationforecast',
          fetchedAt: '2026-03-01T10:00:00.000Z',
        }),
        forecast({
          caseId: 'c1',
          providerId: 'candidate',
          fetchedAt: '2026-03-01T10:15:01.000Z',
        }),
      ],
      observations: [observation({ caseId: 'c1' })],
    });
    expect(
      stratumOf(report, 'met-locationforecast', 'coast').temperature.n,
    ).toBe(0);
    expect(
      report.dropped.filter((row) => row.reason === 'fetch_window'),
    ).toHaveLength(2);
  });

  it('keeps a fetch window of exactly 15 minutes', () => {
    const report = runWeatherValidation({
      cases: [frozenCase({ caseId: 'c1' })],
      forecasts: [
        forecast({
          caseId: 'c1',
          providerId: 'met-locationforecast',
          fetchedAt: '2026-03-01T10:00:00.000Z',
          airTempC: 4,
        }),
        forecast({
          caseId: 'c1',
          providerId: 'candidate',
          fetchedAt: '2026-03-01T10:15:00.000Z',
          airTempC: 7,
        }),
      ],
      observations: [],
    });
    expect(
      report.dropped.filter((row) => row.reason === 'fetch_window'),
    ).toHaveLength(0);
    expect(report.disagreements).toEqual([
      {
        providerId: 'candidate',
        stratum: 'coast',
        n: 1,
        meanAbsoluteTemperatureC: 3,
        accuracy: false,
      },
    ]);
  });

  it('excludes elevation-unmatched rows and non-2 m temperature from the error table', () => {
    const report = runWeatherValidation({
      cases: [frozenCase({ caseId: 'c1' })],
      forecasts: [
        forecast({
          caseId: 'c1',
          providerId: 'candidate',
          elevationSent: false,
          elevationM: null,
          temperatureHeightM: 10,
          airTempC: 1,
        }),
      ],
      observations: [observation({ caseId: 'c1', airTempC: 4 })],
    });
    const measured = stratumOf(report, 'candidate', 'coast');
    expect(measured.observationPairedRows).toBe(0);
    expect(measured.temperature.n).toBe(0);
    expect(measured.coverage.shareElevationSent).toBe(0);
    expect(measured.coverage.shareTemperature2m).toBe(0);
    expect(measured.coverage.n).toBe(1);
  });

  it('counts an empty series as a coverage miss and leaves it out of latency', () => {
    const report = runWeatherValidation({
      cases: [
        frozenCase({ caseId: 'ok' }),
        frozenCase({ caseId: 'miss', lat: 60.01 }),
      ],
      forecasts: [
        forecast({
          caseId: 'ok',
          providerId: 'met-locationforecast',
          latencyMs: 10,
        }),
        forecast({
          caseId: 'miss',
          providerId: 'met-locationforecast',
          lat: 60.01,
          returnedForecast: false,
          airTempC: null,
          windSpeedMs: null,
          precipitationMm: null,
          precipitationProbPct: null,
          latencyMs: 0,
        }),
      ],
      observations: [],
    });
    const measured = stratumOf(report, 'met-locationforecast', 'coast');
    expect(measured.coverage.n).toBe(2);
    expect(measured.coverage.shareReturnedForecast).toBe(0.5);
    expect(report.providers[0].latency.single).toEqual({
      n: 1,
      p50Ms: 10,
      p95Ms: 10,
    });
  });

  it('does not turn a precipitation probability into an occurrence', () => {
    const report = runWeatherValidation({
      cases: [frozenCase({ caseId: 'c1' })],
      forecasts: [
        forecast({
          caseId: 'c1',
          providerId: 'met-locationforecast',
          precipitationMm: null,
          precipitationProbPct: 100,
        }),
      ],
      observations: [observation({ caseId: 'c1', precipitationMm: 0 })],
    });
    const measured = stratumOf(report, 'met-locationforecast', 'coast');
    expect(measured.precipitationOccurrence).toEqual({ n: 0, mismatches: 0 });
    expect(measured.coverage.sharePrecipitationProbability).toBe(1);
    expect(measured.coverage.sharePrecipitationHour).toBe(0);
  });

  it('scores hourly precipitation occurrence at the 0.3 mm motorcycle cut', () => {
    const report = runWeatherValidation({
      cases: [
        frozenCase({ caseId: 'wet' }),
        frozenCase({ caseId: 'dry', lat: 60.02 }),
        frozenCase({ caseId: 'six', lat: 60.03 }),
      ],
      forecasts: [
        forecast({
          caseId: 'wet',
          providerId: 'met-locationforecast',
          precipitationMm: 0.3,
        }),
        forecast({
          caseId: 'dry',
          providerId: 'met-locationforecast',
          lat: 60.02,
          precipitationMm: 0.29,
        }),
        forecast({
          caseId: 'six',
          providerId: 'met-locationforecast',
          lat: 60.03,
          precipitationMm: 4,
          precipitationStepHours: 6,
        }),
      ],
      observations: [
        observation({ caseId: 'wet', precipitationMm: 0 }),
        observation({ caseId: 'dry', lat: 60.02, precipitationMm: 0 }),
        observation({ caseId: 'six', lat: 60.03, precipitationMm: 0 }),
      ],
    });
    expect(
      stratumOf(report, 'met-locationforecast', 'coast')
        .precipitationOccurrence,
    ).toEqual({ n: 2, mismatches: 1 });
  });

  it('scores 10 m wind only and counts a motorcycle warmth-tier change', () => {
    const report = runWeatherValidation({
      cases: [
        frozenCase({ caseId: 'tier' }),
        frozenCase({ caseId: 'wind', lat: 60.04 }),
      ],
      forecasts: [
        forecast({
          caseId: 'tier',
          providerId: 'met-locationforecast',
          airTempC: 18,
          precipitationMm: 1,
          windSpeedMs: null,
          windHeightM: null,
        }),
        forecast({
          caseId: 'wind',
          providerId: 'met-locationforecast',
          lat: 60.04,
          airTempC: null,
          temperatureHeightM: null,
          windSpeedMs: 7,
          windHeightM: 10,
        }),
      ],
      observations: [
        observation({
          caseId: 'tier',
          airTempC: 18,
          precipitationMm: 0,
          windSpeedMs: null,
          windHeightM: null,
        }),
        observation({
          caseId: 'wind',
          lat: 60.04,
          windSpeedMs: 4,
          windHeightM: 10,
        }),
      ],
    });
    const measured = stratumOf(report, 'met-locationforecast', 'coast');
    expect(measured.demandTier).toEqual({ n: 1, mismatches: 1 });
    expect(measured.wind.n).toBe(1);
    expect(measured.wind.mae).toBe(3);
  });

  it('joins a route sample only within 5 km and 50 m', () => {
    const near = runWeatherValidation({
      cases: [
        frozenCase({ caseId: 'near', site: 'route', lat: 60, elevationM: 400 }),
      ],
      forecasts: [
        forecast({
          caseId: 'near',
          providerId: 'met-locationforecast',
          elevationM: 400,
          airTempC: 1,
        }),
      ],
      observations: [
        observation({
          caseId: 'near',
          lat: 60.04,
          elevationM: 450,
          airTempC: 2,
        }),
      ],
    });
    expect(stratumOf(near, 'met-locationforecast', 'coast').temperature.n).toBe(
      1,
    );

    const far = runWeatherValidation({
      cases: [
        frozenCase({ caseId: 'far', site: 'resort', lat: 60, elevationM: 400 }),
      ],
      forecasts: [
        forecast({
          caseId: 'far',
          providerId: 'met-locationforecast',
          elevationM: 400,
        }),
      ],
      observations: [
        observation({ caseId: 'far', lat: 60.1, elevationM: 400, airTempC: 2 }),
      ],
    });
    expect(stratumOf(far, 'met-locationforecast', 'coast').temperature.n).toBe(
      0,
    );

    const tall = runWeatherValidation({
      cases: [frozenCase({ caseId: 'tall', site: 'route', elevationM: 400 })],
      forecasts: [
        forecast({
          caseId: 'tall',
          providerId: 'met-locationforecast',
          elevationM: 400,
        }),
      ],
      observations: [observation({ caseId: 'tall', elevationM: 451 })],
    });
    expect(stratumOf(tall, 'met-locationforecast', 'coast').temperature.n).toBe(
      0,
    );
  });

  it('rejects a high site below 800 m and an inversion that is not cold enough', () => {
    const report = runWeatherValidation({
      cases: [
        frozenCase({
          caseId: 'low',
          stratum: 'high_site',
          elevationM: 799.4,
        }),
        frozenCase({
          caseId: 'weak',
          stratum: 'inversion',
          elevationM: 100,
          stationAirTempC: -1,
          inversionPeer: {
            lat: 60.05,
            lon: 10,
            elevationM: 500,
            airTempC: 0,
            validTimeUtc: VALID,
          },
        }),
      ],
      forecasts: [
        forecast({
          caseId: 'low',
          providerId: 'met-locationforecast',
          elevationM: 799,
        }),
        forecast({
          caseId: 'weak',
          providerId: 'met-locationforecast',
          elevationM: 100,
        }),
      ],
      observations: [],
    });
    expect(report.dropped).toEqual(
      expect.arrayContaining([
        { caseId: 'low', providerId: null, reason: 'stratum_unmet' },
        { caseId: 'weak', providerId: null, reason: 'stratum_unmet' },
      ]),
    );
    expect(
      stratumOf(report, 'met-locationforecast', 'high_site').coverage.n,
    ).toBe(0);
  });

  it('sums five successful route calls and ignores a batch that contains a failure', () => {
    const forecasts: ForecastReading[] = [];
    for (let index = 0; index < MAX_ROUTE_WEATHER_SAMPLES; index += 1) {
      forecasts.push(
        forecast({
          caseId: `good-${index}`,
          providerId: 'met-locationforecast',
          lat: 60 + index / 100,
          latencyMs: 10,
          latencyBatchId: 'good',
        }),
      );
    }
    forecasts.push(
      forecast({
        caseId: 'bad-0',
        providerId: 'met-locationforecast',
        lat: 61,
        latencyMs: 10,
        latencyBatchId: 'bad',
      }),
      forecast({
        caseId: 'bad-1',
        providerId: 'met-locationforecast',
        lat: 61.01,
        returnedForecast: false,
        latencyMs: null,
        latencyBatchId: 'bad',
      }),
    );
    const report = runWeatherValidation({
      cases: forecasts.map((row) =>
        frozenCase({ caseId: row.caseId, lat: row.lat }),
      ),
      forecasts,
      observations: [],
    });
    expect(report.providers[0].latency.route5Sum).toEqual({
      n: 1,
      p50Ms: 50,
      p95Ms: 50,
    });
  });

  it('withholds adoption even when every stop-rule clause is met on fixtures', () => {
    const built = buildTrial(30, {
      candidateTemp: 18,
      metTemp: -10,
      observedTemp: 18,
    });
    const terms: ProviderTerms = {
      providerId: 'candidate',
      cacheAllowed: true,
      attributionShown: true,
      commercialTermsAllowProduct: true,
      pricePublished: true,
      costFitsMonetization: true,
    };
    const report = runWeatherValidation({
      ...built,
      terms: [terms],
      engineCommit: '0123456789abcdef',
    });
    const candidate = report.candidates.find(
      (row) => row.providerId === 'candidate',
    );
    expect(candidate?.allClausesMet).toBe(true);
    expect(candidate?.adoption).toBe('withheld');
    expect(candidate?.highSite.reportable).toBe(true);
    expect(candidate?.highSite.maeC).toBe(0);
    expect(candidate?.highSite.baselineMaeC).toBe(28);
    expect(candidate?.highSite.tierMismatches).toBe(0);
    expect(candidate?.highSite.baselineTierMismatches).toBe(30);
    expect(report.adoption).toBe('withheld');
    expect(JSON.stringify(report)).not.toContain('superior');
    expect(JSON.stringify(report)).not.toContain('winner');
  });

  it('does not treat fewer than 30 overlapping rows as a reportable stratum', () => {
    const built = buildTrial(29, {
      candidateTemp: 18,
      metTemp: -10,
      observedTemp: 18,
    });
    const report = runWeatherValidation({
      ...built,
      engineCommit: '0123456789abcdef',
      terms: [
        {
          providerId: 'candidate',
          cacheAllowed: true,
          attributionShown: true,
          commercialTermsAllowProduct: true,
          pricePublished: true,
          costFitsMonetization: true,
        },
      ],
    });
    const candidate = report.candidates.find(
      (row) => row.providerId === 'candidate',
    );
    expect(candidate?.highSite.reportable).toBe(false);
    expect(
      candidate?.clauses.find((clause) => clause.id === 'high_site_rows')?.met,
    ).toBe(false);
    expect(candidate?.allClausesMet).toBe(false);
  });
});

function buildTrial(
  count: number,
  temps: { candidateTemp: number; metTemp: number; observedTemp: number },
) {
  const cases: FrozenCase[] = [];
  const forecasts: ForecastReading[] = [];
  const observations: ObservationReading[] = [];
  const strata: Array<{ stratum: FrozenCase['stratum']; elevationM: number }> =
    [
      { stratum: 'high_site', elevationM: 900 },
      { stratum: 'inversion', elevationM: 100 },
    ];
  for (const site of strata) {
    for (let index = 0; index < count; index += 1) {
      const caseId = `${site.stratum}-${index}`;
      const lat = Number((60 + index / 1000).toFixed(4));
      cases.push(
        frozenCase({
          caseId,
          lat,
          elevationM: site.elevationM,
          stratum: site.stratum,
          stationAirTempC: site.stratum === 'inversion' ? -4 : null,
          inversionPeer:
            site.stratum === 'inversion'
              ? {
                  lat: lat + 0.05,
                  lon: 10,
                  elevationM: site.elevationM + 400,
                  airTempC: -1,
                  validTimeUtc: VALID,
                }
              : null,
        }),
      );
      forecasts.push(
        forecast({
          caseId,
          providerId: 'met-locationforecast',
          lat,
          elevationM: site.elevationM,
          airTempC: temps.metTemp,
          precipitationMm: 0,
          windSpeedMs: 0,
        }),
        forecast({
          caseId,
          providerId: 'candidate',
          lat,
          elevationM: site.elevationM,
          airTempC: temps.candidateTemp,
          precipitationMm: 0,
          windSpeedMs: 0,
        }),
      );
      observations.push(
        observation({
          caseId,
          lat,
          elevationM: site.elevationM,
          airTempC: temps.observedTemp,
          precipitationMm: 0,
          windSpeedMs: 0,
        }),
      );
    }
  }
  return { cases, forecasts, observations };
}
