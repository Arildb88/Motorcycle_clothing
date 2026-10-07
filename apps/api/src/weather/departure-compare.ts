import { maxFiniteWeatherNumber } from '../recommend/weather.types';

/**
 * Factual nearby departure times. Nothing here ranks or scores a departure.
 */

export const DEPARTURE_COMPARE_STEP_MS = 60 * 60 * 1000;
export const DEPARTURE_COMPARE_PAST_GRACE_MS = 5 * 60 * 1000;
export const DEPARTURE_COMPARE_LIMIT = 4;
const DEPARTURE_COMPARE_FORWARD_HOURS = 6;

/**
 * Two to four nearby departures around the chosen time.
 * Hours more than a few minutes in the past are left out, except the chosen
 * departure. If that leaves only one time, the following hour is kept so
 * there is still a pair to compare.
 */
export function nearbyDepartureTimes(anchor: Date, now: Date): Date[] {
  const chosen = anchor.getTime();
  if (!Number.isFinite(chosen)) return [];
  const earliest = now.getTime() - DEPARTURE_COMPARE_PAST_GRACE_MS;
  const times: number[] = [];

  const push = (ms: number, allowPast: boolean) => {
    if (times.length >= DEPARTURE_COMPARE_LIMIT) return;
    if (!Number.isFinite(ms) || times.includes(ms)) return;
    if (!allowPast && ms < earliest) return;
    times.push(ms);
  };

  for (let hour = -1; hour <= DEPARTURE_COMPARE_FORWARD_HOURS; hour += 1) {
    const ms = chosen + hour * DEPARTURE_COMPARE_STEP_MS;
    push(ms, ms === chosen);
  }

  if (times.length < 2) {
    for (
      let hour = 1;
      hour <= DEPARTURE_COMPARE_FORWARD_HOURS && times.length < 2;
      hour += 1
    ) {
      push(chosen + hour * DEPARTURE_COMPARE_STEP_MS, true);
    }
  }

  times.sort((a, b) => a - b);
  return times.map((ms) => new Date(ms));
}

export type DepartureSampleConditions = {
  requestedAt: string;
  available: boolean;
  reason?:
    | 'missing'
    | 'out_of_range'
    | 'configuration'
    | 'timeout'
    | 'empty'
    | 'missing_fields'
    | 'provider';
  forecastAt?: string;
  airTempC?: number;
  precipitationProbPct?: number | null;
  precipitationMm?: number;
  windSpeedMs?: number;
};

export type DepartureConditions = {
  minTempC: number;
  maxTempC: number;
  maxRainProbPct: number | null;
  maxPrecipMm: number;
  maxWindMs: number;
  forecastFrom: string;
  forecastTo: string;
};

export type DepartureComparisonRow = {
  available: boolean;
  unavailableReason?:
    | 'missing'
    | 'out_of_range'
    | 'configuration'
    | 'timeout'
    | 'empty'
    | 'missing_fields'
    | 'provider';
  variesByTime: boolean;
  conditions?: DepartureConditions;
  missingAt: string[];
};

const FAILURE_ORDER = [
  'configuration',
  'timeout',
  'empty',
  'missing_fields',
  'out_of_range',
  'provider',
  'missing',
] as const;

function departureFailureReason(
  samples: DepartureSampleConditions[],
): (typeof FAILURE_ORDER)[number] {
  for (const reason of FAILURE_ORDER) {
    if (samples.some((sample) => sample.reason === reason)) return reason;
  }
  return 'missing';
}

/** Summarize the samples that actually have a forecast. No combined score. */
export function comparisonRowFromSamples(
  samples: DepartureSampleConditions[],
  variesByTime: boolean,
): DepartureComparisonRow {
  const matched = samples.filter(
    (sample) =>
      sample.available &&
      sample.forecastAt != null &&
      Number.isFinite(sample.airTempC) &&
      Number.isFinite(sample.precipitationMm) &&
      Number.isFinite(sample.windSpeedMs),
  );
  const missingAt = samples
    .filter((sample) => !sample.available)
    .map((sample) => sample.requestedAt);
  const forecastTimes = matched
    .map((sample) => Date.parse(sample.forecastAt ?? ''))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => a - b);

  if (matched.length === 0 || forecastTimes.length === 0) {
    return {
      available: false,
      unavailableReason: departureFailureReason(samples),
      variesByTime,
      missingAt,
    };
  }

  return {
    available: true,
    variesByTime,
    missingAt,
    conditions: {
      minTempC: Math.min(...matched.map((sample) => sample.airTempC as number)),
      maxTempC: Math.max(...matched.map((sample) => sample.airTempC as number)),
      maxRainProbPct: maxFiniteWeatherNumber(
        matched.map((sample) => sample.precipitationProbPct),
      ),
      maxPrecipMm: Math.max(
        ...matched.map((sample) => sample.precipitationMm as number),
      ),
      maxWindMs: Math.max(
        ...matched.map((sample) => sample.windSpeedMs as number),
      ),
      forecastFrom: new Date(forecastTimes[0]).toISOString(),
      forecastTo: new Date(
        forecastTimes[forecastTimes.length - 1],
      ).toISOString(),
    },
  };
}
