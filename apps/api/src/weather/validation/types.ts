/**
 * Provider-neutral rows for the weather comparison protocol.
 * Callers supply readings. This module does not fetch them.
 */

export const MET_BASELINE_PROVIDER_ID = 'met-locationforecast';

export const LEAD_BUCKETS = ['h1', 'h6', 'next_morning'] as const;
export type LeadBucket = (typeof LEAD_BUCKETS)[number];

export const VALIDATION_STRATA = [
  'coast',
  'inland_valley',
  'inversion',
  'high_site',
  'route',
] as const;
export type ValidationStratum = (typeof VALIDATION_STRATA)[number];

export const VALIDATION_SITES = ['station', 'route', 'resort'] as const;
export type ValidationSite = (typeof VALIDATION_SITES)[number];

/** Protocol choices from WEATHER_DATA_QUALITY.md §11. */
export const VALIDATION_LIMITS = {
  fetchWindowMs: 15 * 60 * 1000,
  stationJoinMaxM: 5_000,
  stationJoinMaxElevationM: 50,
  inversionMaxSeparationM: 20_000,
  inversionMinElevationDiffM: 300,
  inversionMinColderC: 2,
  highSiteMinElevationM: 800,
  minReportableRows: 30,
  leadH1MinMs: 30 * 60 * 1000,
  leadH1MaxMs: 90 * 60 * 1000,
  leadH6MinMs: 5 * 60 * 60 * 1000,
  leadH6MaxMs: 7 * 60 * 60 * 1000,
  nextMorningValidStartMin: 6 * 60,
  nextMorningValidEndMin: 9 * 60,
  nextMorningFetchStartMin: 16 * 60,
  nextMorningFetchEndMin: 20 * 60,
} as const;

export type InversionPeer = {
  lat: number;
  lon: number;
  elevationM: number;
  airTempC: number;
  validTimeUtc: string;
};

/**
 * One frozen comparison case. The same lat, lon, elevation, and valid time
 * are required on every provider that claims the pair.
 */
export type FrozenCase = {
  caseId: string;
  lat: number;
  lon: number;
  elevationM: number;
  validTimeUtc: string;
  leadBucket: LeadBucket;
  stratum: ValidationStratum;
  site: ValidationSite;
  /**
   * Temperature that froze an inversion case, from the station observation,
   * not from a vendor forecast.
   */
  stationAirTempC?: number | null;
  inversionPeer?: InversionPeer | null;
};

/**
 * One provider's reading for a case. Null fields are coverage misses.
 * Do not substitute a probability for a missing amount, or 0 for a missing temperature.
 */
export type ForecastReading = {
  providerId: string;
  caseId: string;
  lat: number;
  lon: number;
  elevationM: number | null;
  elevationSent: boolean;
  validTimeUtc: string;
  fetchedAt: string;
  modelRunAt?: string | null;
  airTempC: number | null;
  /** Only 2 m air temperature is scored. */
  temperatureHeightM: number | null;
  windSpeedMs: number | null;
  /** Only 10 m wind is scored. */
  windHeightM: number | null;
  precipitationMm: number | null;
  /** Only a 1-hour amount is scored. */
  precipitationStepHours: number | null;
  precipitationProbPct: number | null;
  windFromDeg?: number | null;
  /** False for an HTTP error or an empty series. That is a miss, not a skipped row. */
  returnedForecast: boolean;
  /** Successful response time. Null is excluded from latency percentiles. */
  latencyMs: number | null;
  /**
   * Groups sequential route calls. A batch is a latency sum only when it has
   * exactly MAX_ROUTE_WEATHER_SAMPLES successful responses.
   */
  latencyBatchId?: string | null;
};

export type ObservationReading = {
  caseId: string;
  lat: number;
  lon: number;
  elevationM: number;
  validTimeUtc: string;
  airTempC: number | null;
  temperatureHeightM: number | null;
  windSpeedMs: number | null;
  windHeightM: number | null;
  precipitationMm: number | null;
};

/**
 * Commercial facts the caller already verified. The harness does not fetch a price page.
 */
export type ProviderTerms = {
  providerId: string;
  cacheAllowed: boolean;
  attributionShown: boolean;
  /** True only when the product's ads or subscription are allowed. Null does not pass. */
  commercialTermsAllowProduct: boolean | null;
  /** True when the fee is none, or a number on the vendor's own page or checkout. */
  pricePublished: boolean;
  /** Human judgment against the monetization note. The harness does not infer it. */
  costFitsMonetization: boolean;
};

export type ValidationInput = {
  cases: FrozenCase[];
  forecasts: ForecastReading[];
  observations: ObservationReading[];
  terms?: ProviderTerms[];
  /**
   * Commit of the motorcycle exposure function used for tier counts.
   * The stop rule does not pass without a non-empty hash. The harness does not look up git.
   */
  engineCommit?: string | null;
  baselineProviderId?: string;
};

export type DroppedRow = {
  caseId: string;
  providerId: string | null;
  reason: string;
};

export type ErrorSummary = {
  n: number;
  mae: number | null;
  meanBias: number | null;
};

export type CountSummary = {
  n: number;
  mismatches: number;
};

export type CoverageSummary = {
  n: number;
  shareReturnedForecast: number | null;
  shareElevationSent: number | null;
  shareTemperature2m: number | null;
  shareWind10m: number | null;
  sharePrecipitationHour: number | null;
  sharePrecipitationProbability: number | null;
};

export type StratumMeasurement = {
  stratum: ValidationStratum;
  observationPairedRows: number;
  reportable: boolean;
  temperature: ErrorSummary;
  wind: { n: number; mae: number | null };
  precipitationOccurrence: CountSummary;
  demandTier: CountSummary;
  coverage: CoverageSummary;
};

export type LatencySummary = {
  n: number;
  p50Ms: number | null;
  p95Ms: number | null;
};

export type ProviderMeasurement = {
  providerId: string;
  strata: StratumMeasurement[];
  latency: {
    single: LatencySummary;
    /** Sum of five successful sequential calls. */
    route5Sum: LatencySummary;
  };
};

export type DisagreementSheet = {
  providerId: string;
  stratum: ValidationStratum;
  n: number;
  meanAbsoluteTemperatureC: number | null;
  /** Provider-versus-MET on the same tuple is not an accuracy score. */
  accuracy: false;
};

export type StopRuleClauseId =
  | 'high_site_rows'
  | 'inversion_rows'
  | 'temperature_mae_both_strata'
  | 'demand_tier_one_stratum'
  | 'engine_frozen'
  | 'cache_and_attribution'
  | 'commercial_terms'
  | 'price_published'
  | 'cost_fits_monetization';

export type StopRuleClause = {
  id: StopRuleClauseId;
  met: boolean;
};

export type SharedStratumScore = {
  n: number;
  reportable: boolean;
  maeC: number | null;
  baselineMaeC: number | null;
  tierN: number;
  tierMismatches: number;
  baselineTierMismatches: number;
};

export type CandidateAssessment = {
  providerId: string;
  highSite: SharedStratumScore;
  inversion: SharedStratumScore;
  clauses: StopRuleClause[];
  allClausesMet: boolean;
  /** Fixtures never adopt a provider. A live trial is still a separate decision. */
  adoption: 'withheld';
};

export type ValidationReport = {
  baselineProviderId: string;
  engineCommit: string | null;
  /** This harness does not perform a live trial. */
  empiricalTrial: false;
  adoption: 'withheld';
  providers: ProviderMeasurement[];
  disagreements: DisagreementSheet[];
  candidates: CandidateAssessment[];
  dropped: DroppedRow[];
};
