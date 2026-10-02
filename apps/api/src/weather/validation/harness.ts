import { MAX_ROUTE_WEATHER_SAMPLES } from '../../routing/route-weather-sampling';
import type { WeatherPoint } from '../../recommend/weather.types';
import {
  countDemandTierMismatches,
  finiteNumber,
  nearestRankPercentile,
  precipitationOccurrenceMismatches,
  share,
  temperatureError,
  windError,
} from './metrics';
import {
  leadMatchesBucket,
  parseInstant,
  roundElevationM,
  sameInstant,
  shapeCase,
  truncateLat,
  truncateLon,
  haversineMetres,
  type ShapedCase,
} from './shape';
import {
  MET_BASELINE_PROVIDER_ID,
  VALIDATION_LIMITS,
  VALIDATION_STRATA,
  type CandidateAssessment,
  type CoverageSummary,
  type DisagreementSheet,
  type DroppedRow,
  type ForecastReading,
  type ObservationReading,
  type ProviderMeasurement,
  type ProviderTerms,
  type SharedStratumScore,
  type StopRuleClause,
  type StratumMeasurement,
  type ValidationInput,
  type ValidationReport,
  type ValidationStratum,
} from './types';

type AcceptedForecast = {
  shaped: ShapedCase;
  forecast: ForecastReading;
};

type ScoredForecast = AcceptedForecast & {
  observation: ObservationReading | null;
};

/**
 * Shape paired weather rows and compute §11 measurements.
 * No network calls. The returned adoption is always withheld.
 */
export function runWeatherValidation(input: ValidationInput): ValidationReport {
  const baselineProviderId =
    input.baselineProviderId?.trim() || MET_BASELINE_PROVIDER_ID;
  const engineCommit = input.engineCommit?.trim()
    ? input.engineCommit.trim()
    : null;
  const dropped: DroppedRow[] = [];
  const shapedById = new Map<string, ShapedCase>();
  const caseStatus = new Map<string, string>();
  const seenCaseIds = new Set<string>();
  const duplicateCaseIds = new Set<string>();

  for (const raw of input.cases) {
    const caseId = raw.caseId ?? '';
    if (seenCaseIds.has(caseId)) duplicateCaseIds.add(caseId);
    seenCaseIds.add(caseId);
  }
  const consumedCaseIds = new Set<string>();
  for (const raw of input.cases) {
    const caseId = raw.caseId ?? '';
    if (duplicateCaseIds.has(caseId)) {
      if (!consumedCaseIds.has(caseId)) {
        dropped.push({ caseId, providerId: null, reason: 'duplicate_case' });
        caseStatus.set(caseId, 'duplicate_case');
        consumedCaseIds.add(caseId);
      }
      continue;
    }
    const shaped = shapeCase(raw);
    if (!shaped.ok) {
      dropped.push({ caseId, providerId: null, reason: shaped.reason });
      caseStatus.set(caseId, shaped.reason);
      continue;
    }
    shapedById.set(caseId, shaped.shaped);
    caseStatus.set(caseId, 'ok');
  }

  const accepted: AcceptedForecast[] = [];
  const seenForecasts = new Map<string, number[]>();

  input.forecasts.forEach((forecast, index) => {
    const shaped = shapedById.get(forecast.caseId);
    if (!shaped) {
      dropped.push({
        caseId: forecast.caseId,
        providerId: forecast.providerId,
        reason: caseStatus.get(forecast.caseId) ?? 'unknown_case',
      });
      return;
    }
    const paired = pairForecast(shaped, forecast);
    if (!paired.ok) {
      dropped.push({
        caseId: forecast.caseId,
        providerId: forecast.providerId,
        reason: paired.reason,
      });
      return;
    }
    const key = `${forecast.providerId}\u0000${forecast.caseId}`;
    const indexes = seenForecasts.get(key) ?? [];
    indexes.push(index);
    seenForecasts.set(key, indexes);
    accepted.push({ shaped, forecast });
  });

  const duplicateKeys = new Set(
    [...seenForecasts.entries()]
      .filter(([, indexes]) => indexes.length > 1)
      .map(([key]) => key),
  );
  const uniqueAccepted = accepted.filter((row) => {
    const key = `${row.forecast.providerId}\u0000${row.forecast.caseId}`;
    if (!duplicateKeys.has(key)) return true;
    dropped.push({
      caseId: row.forecast.caseId,
      providerId: row.forecast.providerId,
      reason: 'duplicate_forecast',
    });
    return false;
  });

  const byCase = new Map<string, AcceptedForecast[]>();
  for (const row of uniqueAccepted) {
    const rows = byCase.get(row.shaped.caseId) ?? [];
    rows.push(row);
    byCase.set(row.shaped.caseId, rows);
  }

  const inWindow: AcceptedForecast[] = [];
  for (const [caseId, rows] of byCase) {
    const times = rows
      .map((row) => parseInstant(row.forecast.fetchedAt))
      .filter((time): time is number => time != null);
    const spread =
      times.length === 0 ? Infinity : Math.max(...times) - Math.min(...times);
    if (spread > VALIDATION_LIMITS.fetchWindowMs) {
      for (const row of rows) {
        dropped.push({
          caseId,
          providerId: row.forecast.providerId,
          reason: 'fetch_window',
        });
      }
      continue;
    }
    inWindow.push(...rows);
  }

  const observationsByCase = new Map<string, ObservationReading[]>();
  for (const observation of input.observations) {
    const rows = observationsByCase.get(observation.caseId) ?? [];
    rows.push(observation);
    observationsByCase.set(observation.caseId, rows);
  }

  const observationByCase = new Map<string, ObservationReading | null>();
  for (const row of inWindow) {
    if (observationByCase.has(row.shaped.caseId)) continue;
    observationByCase.set(
      row.shaped.caseId,
      joinObservation(
        row.shaped,
        observationsByCase.get(row.shaped.caseId) ?? [],
        dropped,
      ),
    );
  }

  const scored: ScoredForecast[] = inWindow.map((row) => ({
    ...row,
    observation: observationByCase.get(row.shaped.caseId) ?? null,
  }));

  const providerIds = providerIdList(
    scored,
    input.terms ?? [],
    baselineProviderId,
  );
  const providers = providerIds.map((providerId) =>
    measureProvider(
      providerId,
      scored.filter((row) => row.forecast.providerId === providerId),
    ),
  );
  const disagreements = disagreementSheets(scored, baselineProviderId);
  const candidates = providerIds
    .filter((providerId) => providerId !== baselineProviderId)
    .map((providerId) =>
      assessCandidate({
        providerId,
        scored,
        baselineProviderId,
        terms:
          (input.terms ?? []).find((term) => term.providerId === providerId) ??
          null,
        engineCommit,
      }),
    );

  return {
    baselineProviderId,
    engineCommit,
    empiricalTrial: false,
    adoption: 'withheld',
    providers,
    disagreements,
    candidates,
    dropped,
  };
}

function pairForecast(
  shaped: ShapedCase,
  forecast: ForecastReading,
): { ok: true } | { ok: false; reason: string } {
  if (!forecast.providerId || !forecast.providerId.trim()) {
    return { ok: false, reason: 'invalid_forecast' };
  }
  const lat = truncateLat(forecast.lat);
  const lon = truncateLon(forecast.lon);
  if (lat == null || lon == null || lat !== shaped.lat || lon !== shaped.lon) {
    return { ok: false, reason: 'unpaired_coordinate' };
  }
  if (!sameInstant(forecast.validTimeUtc, shaped.validTimeUtc)) {
    return { ok: false, reason: 'unpaired_time' };
  }
  if (forecast.elevationSent) {
    const elevation = roundElevationM(forecast.elevationM);
    if (elevation == null || elevation !== shaped.elevationM) {
      return { ok: false, reason: 'unpaired_elevation' };
    }
  }
  if (
    !leadMatchesBucket(
      shaped.leadBucket,
      shaped.validTimeUtc,
      forecast.fetchedAt,
    )
  ) {
    return { ok: false, reason: 'lead_bucket' };
  }
  return { ok: true };
}

function joinObservation(
  shaped: ShapedCase,
  observations: ObservationReading[],
  dropped: DroppedRow[],
): ObservationReading | null {
  const sameTime = observations.filter((observation) =>
    sameInstant(observation.validTimeUtc, shaped.validTimeUtc),
  );
  if (shaped.site === 'station') {
    const matches = sameTime.filter((observation) => {
      const lat = truncateLat(observation.lat);
      const lon = truncateLon(observation.lon);
      const elevation = roundElevationM(observation.elevationM);
      return (
        lat === shaped.lat &&
        lon === shaped.lon &&
        elevation === shaped.elevationM
      );
    });
    if (matches.length > 1) {
      dropped.push({
        caseId: shaped.caseId,
        providerId: null,
        reason: 'ambiguous_observation',
      });
      return null;
    }
    return matches[0] ?? null;
  }
  const near = sameTime.filter((observation) => {
    const lat = truncateLat(observation.lat);
    const lon = truncateLon(observation.lon);
    const elevation = roundElevationM(observation.elevationM);
    if (lat == null || lon == null || elevation == null) return false;
    const distance = haversineMetres(shaped.lat, shaped.lon, lat, lon);
    return (
      distance <= VALIDATION_LIMITS.stationJoinMaxM &&
      Math.abs(elevation - shaped.elevationM) <=
        VALIDATION_LIMITS.stationJoinMaxElevationM
    );
  });
  if (near.length > 1) {
    dropped.push({
      caseId: shaped.caseId,
      providerId: null,
      reason: 'ambiguous_observation',
    });
    return null;
  }
  return near[0] ?? null;
}

function providerIdList(
  scored: ScoredForecast[],
  terms: ProviderTerms[],
  baselineProviderId: string,
): string[] {
  const ids = new Set<string>([baselineProviderId]);
  for (const row of scored) ids.add(row.forecast.providerId);
  for (const term of terms) {
    if (term.providerId.trim()) ids.add(term.providerId);
  }
  return [...ids];
}

function measureProvider(
  providerId: string,
  rows: ScoredForecast[],
): ProviderMeasurement {
  return {
    providerId,
    strata: VALIDATION_STRATA.map((stratum) =>
      measureStratum(
        stratum,
        rows.filter((row) => row.shaped.stratum === stratum),
      ),
    ),
    latency: {
      single: latencySummary(
        rows
          .filter(
            (row) =>
              !row.forecast.latencyBatchId &&
              row.forecast.returnedForecast &&
              finiteNumber(row.forecast.latencyMs),
          )
          .map((row) => row.forecast.latencyMs as number),
      ),
      route5Sum: routeLatency(rows),
    },
  };
}

function measureStratum(
  stratum: ValidationStratum,
  rows: ScoredForecast[],
): StratumMeasurement {
  const observed = rows.filter(
    (row) => row.forecast.elevationSent && row.observation,
  );
  const temperaturePairs = observed.flatMap((row) => {
    const forecastC = scorableTemp(row.forecast);
    const observedC = row.observation ? scorableTemp(row.observation) : null;
    return forecastC == null || observedC == null
      ? []
      : [{ forecastC, observedC }];
  });
  const windPairs = observed.flatMap((row) => {
    const forecastMs = scorableWind(row.forecast);
    const observedMs = row.observation ? scorableWind(row.observation) : null;
    return forecastMs == null || observedMs == null
      ? []
      : [{ forecastMs, observedMs }];
  });
  const precipPairs = observed.flatMap((row) => {
    const forecastMm = scorablePrecip(row.forecast);
    const observedMm = finiteNumber(row.observation?.precipitationMm)
      ? row.observation.precipitationMm
      : null;
    return forecastMm == null || observedMm == null
      ? []
      : [{ forecastMm, observedMm }];
  });
  const tierPairs = observed.flatMap((row) => {
    if (!row.observation) return [];
    const pair = tierPoints(row.forecast, row.observation, row.shaped);
    return pair ? [pair] : [];
  });
  const temperature = temperatureError(temperaturePairs);
  return {
    stratum,
    observationPairedRows: observed.length,
    reportable: observed.length >= VALIDATION_LIMITS.minReportableRows,
    temperature,
    wind: windError(windPairs),
    precipitationOccurrence: precipitationOccurrenceMismatches(precipPairs),
    demandTier: {
      n: tierPairs.length,
      mismatches: countDemandTierMismatches(tierPairs),
    },
    coverage: coverage(rows),
  };
}

function coverage(rows: ScoredForecast[]): CoverageSummary {
  const n = rows.length;
  return {
    n,
    shareReturnedForecast: share(
      rows.filter((row) => row.forecast.returnedForecast).length,
      n,
    ),
    shareElevationSent: share(
      rows.filter((row) => row.forecast.elevationSent).length,
      n,
    ),
    shareTemperature2m: share(
      rows.filter((row) => scorableTemp(row.forecast) != null).length,
      n,
    ),
    shareWind10m: share(
      rows.filter((row) => scorableWind(row.forecast) != null).length,
      n,
    ),
    sharePrecipitationHour: share(
      rows.filter((row) => scorablePrecip(row.forecast) != null).length,
      n,
    ),
    sharePrecipitationProbability: share(
      rows.filter((row) => finiteNumber(row.forecast.precipitationProbPct))
        .length,
      n,
    ),
  };
}

function latencySummary(values: number[]) {
  return {
    n: values.length,
    p50Ms: nearestRankPercentile(values, 50),
    p95Ms: nearestRankPercentile(values, 95),
  };
}

function routeLatency(rows: ScoredForecast[]) {
  const batches = new Map<string, ScoredForecast[]>();
  for (const row of rows) {
    const batchId = row.forecast.latencyBatchId;
    if (!batchId) continue;
    const group = batches.get(batchId) ?? [];
    group.push(row);
    batches.set(batchId, group);
  }
  const sums: number[] = [];
  for (const group of batches.values()) {
    if (group.length !== MAX_ROUTE_WEATHER_SAMPLES) continue;
    const latencies: number[] = [];
    let failed = false;
    for (const row of group) {
      const latency = row.forecast.latencyMs;
      if (!row.forecast.returnedForecast || !finiteNumber(latency)) {
        failed = true;
        break;
      }
      latencies.push(latency);
    }
    if (failed) continue;
    sums.push(latencies.reduce((sum, latency) => sum + latency, 0));
  }
  return latencySummary(sums);
}

function disagreementSheets(
  scored: ScoredForecast[],
  baselineProviderId: string,
): DisagreementSheet[] {
  const baseline = new Map<string, ScoredForecast>();
  for (const row of scored) {
    if (row.forecast.providerId !== baselineProviderId) continue;
    if (!row.forecast.elevationSent) continue;
    if (scorableTemp(row.forecast) == null) continue;
    baseline.set(row.shaped.caseId, row);
  }
  const sheets: DisagreementSheet[] = [];
  const candidates = new Set(
    scored
      .map((row) => row.forecast.providerId)
      .filter((providerId) => providerId !== baselineProviderId),
  );
  for (const providerId of candidates) {
    for (const stratum of VALIDATION_STRATA) {
      const diffs: number[] = [];
      for (const row of scored) {
        if (row.forecast.providerId !== providerId) continue;
        if (row.shaped.stratum !== stratum) continue;
        if (!row.forecast.elevationSent) continue;
        const candidateTemp = scorableTemp(row.forecast);
        const base = baseline.get(row.shaped.caseId);
        const baseTemp = base ? scorableTemp(base.forecast) : null;
        if (!base || candidateTemp == null || baseTemp == null) continue;
        if (base.shaped.stratum !== stratum) continue;
        diffs.push(Math.abs(candidateTemp - baseTemp));
      }
      if (diffs.length === 0) continue;
      const meanAbsolute =
        diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
      sheets.push({
        providerId,
        stratum,
        n: diffs.length,
        meanAbsoluteTemperatureC: meanAbsolute,
        accuracy: false,
      });
    }
  }
  return sheets;
}

function assessCandidate(input: {
  providerId: string;
  scored: ScoredForecast[];
  baselineProviderId: string;
  terms: ProviderTerms | null;
  engineCommit: string | null;
}): CandidateAssessment {
  const highSite = sharedStratum(input, 'high_site');
  const inversion = sharedStratum(input, 'inversion');
  const maeBetter =
    highSite.reportable &&
    inversion.reportable &&
    highSite.maeC != null &&
    highSite.baselineMaeC != null &&
    inversion.maeC != null &&
    inversion.baselineMaeC != null &&
    highSite.maeC < highSite.baselineMaeC &&
    inversion.maeC < inversion.baselineMaeC;
  const tierBetter =
    highSite.reportable &&
    inversion.reportable &&
    ((highSite.tierN > 0 &&
      highSite.tierMismatches < highSite.baselineTierMismatches) ||
      (inversion.tierN > 0 &&
        inversion.tierMismatches < inversion.baselineTierMismatches));
  const clauses: StopRuleClause[] = [
    { id: 'high_site_rows', met: highSite.reportable },
    { id: 'inversion_rows', met: inversion.reportable },
    { id: 'temperature_mae_both_strata', met: maeBetter },
    { id: 'demand_tier_one_stratum', met: tierBetter },
    { id: 'engine_frozen', met: input.engineCommit != null },
    {
      id: 'cache_and_attribution',
      met:
        input.terms?.cacheAllowed === true &&
        input.terms.attributionShown === true,
    },
    {
      id: 'commercial_terms',
      met: input.terms?.commercialTermsAllowProduct === true,
    },
    { id: 'price_published', met: input.terms?.pricePublished === true },
    {
      id: 'cost_fits_monetization',
      met: input.terms?.costFitsMonetization === true,
    },
  ];
  return {
    providerId: input.providerId,
    highSite,
    inversion,
    clauses,
    allClausesMet: clauses.every((clause) => clause.met),
    adoption: 'withheld',
  };
}

function sharedStratum(
  input: {
    providerId: string;
    scored: ScoredForecast[];
    baselineProviderId: string;
  },
  stratum: ValidationStratum,
): SharedStratumScore {
  const rowsFor = (providerId: string) =>
    input.scored.filter(
      (row) =>
        row.forecast.providerId === providerId &&
        row.shaped.stratum === stratum,
    );
  const baselineRows = new Map(
    rowsFor(input.baselineProviderId).map((row) => [row.shaped.caseId, row]),
  );
  const temperaturePairs: Array<{ forecastC: number; observedC: number }> = [];
  const baselineTemperature: Array<{ forecastC: number; observedC: number }> =
    [];
  const tierPairs: Array<{ forecast: WeatherPoint; observed: WeatherPoint }> =
    [];
  const baselineTier: Array<{
    forecast: WeatherPoint;
    observed: WeatherPoint;
  }> = [];

  for (const row of rowsFor(input.providerId)) {
    const base = baselineRows.get(row.shaped.caseId);
    if (!base?.observation || !row.observation) continue;
    if (!row.forecast.elevationSent || !base.forecast.elevationSent) continue;
    const forecastC = scorableTemp(row.forecast);
    const baselineC = scorableTemp(base.forecast);
    const observedC = scorableTemp(row.observation);
    if (forecastC == null || baselineC == null || observedC == null) continue;
    temperaturePairs.push({ forecastC, observedC });
    baselineTemperature.push({ forecastC: baselineC, observedC });
    const candidateTier = tierPoints(row.forecast, row.observation, row.shaped);
    const baselineTierPoints = tierPoints(
      base.forecast,
      base.observation,
      base.shaped,
    );
    if (candidateTier && baselineTierPoints) {
      tierPairs.push(candidateTier);
      baselineTier.push(baselineTierPoints);
    }
  }

  const candidateError = temperatureError(temperaturePairs);
  const baselineError = temperatureError(baselineTemperature);
  return {
    n: temperaturePairs.length,
    reportable: temperaturePairs.length >= VALIDATION_LIMITS.minReportableRows,
    maeC: candidateError.mae,
    baselineMaeC: baselineError.mae,
    tierN: tierPairs.length,
    tierMismatches: countDemandTierMismatches(tierPairs),
    baselineTierMismatches: countDemandTierMismatches(baselineTier),
  };
}

function scorableTemp(reading: {
  airTempC: number | null;
  temperatureHeightM: number | null;
}): number | null {
  if (reading.temperatureHeightM !== 2 || !finiteNumber(reading.airTempC))
    return null;
  return reading.airTempC;
}

function scorableWind(reading: {
  windSpeedMs: number | null;
  windHeightM: number | null;
}): number | null {
  if (reading.windHeightM !== 10 || !finiteNumber(reading.windSpeedMs))
    return null;
  return reading.windSpeedMs;
}

function scorablePrecip(reading: ForecastReading): number | null {
  if (
    reading.precipitationStepHours !== 1 ||
    !finiteNumber(reading.precipitationMm)
  ) {
    return null;
  }
  return reading.precipitationMm;
}

function tierPoints(
  forecast: ForecastReading,
  observation: ObservationReading,
  shaped: ShapedCase,
): { forecast: WeatherPoint; observed: WeatherPoint } | null {
  if (scorableTemp(forecast) == null || scorableTemp(observation) == null)
    return null;
  const forecastWind = scorableWind(forecast);
  const observedWind = scorableWind(observation);
  if ((forecastWind == null) !== (observedWind == null)) return null;
  const forecastMm = forecast.precipitationMm;
  const observedMm = observation.precipitationMm;
  const forecastPrecipKnown = finiteNumber(forecastMm);
  const observedPrecipKnown = finiteNumber(observedMm);
  if (forecastPrecipKnown && forecast.precipitationStepHours !== 1) return null;
  if (forecastPrecipKnown !== observedPrecipKnown) return null;
  const forecastTemp = scorableTemp(forecast);
  const observedTemp = scorableTemp(observation);
  const probability = forecast.precipitationProbPct;
  if (forecastTemp == null || observedTemp == null) return null;
  return {
    forecast: {
      lat: shaped.lat,
      lon: shaped.lon,
      airTempC: forecastTemp,
      windSpeedMs: forecastWind ?? 0,
      precipitationMm: forecastPrecipKnown ? forecastMm : 0,
      precipitationProbPct: finiteNumber(probability) ? probability : 0,
    },
    observed: {
      lat: shaped.lat,
      lon: shaped.lon,
      airTempC: observedTemp,
      windSpeedMs: observedWind ?? 0,
      precipitationMm: observedPrecipKnown ? observedMm : 0,
      precipitationProbPct: 0,
    },
  };
}
