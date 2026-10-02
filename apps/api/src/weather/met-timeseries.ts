/**
 * MET locationforecast compact is hourly at first and later every six hours.
 * A published step is then at most three hours from the time it represents.
 * A larger gap is outside the series, not a forecast for that departure.
 */
export const FORECAST_MATCH_MAX_GAP_MS = 3 * 60 * 60 * 1000;

export type MetTimeseriesMatch = {
  index: number;
  matchedAt: string;
  gapMs: number;
  inRange: boolean;
};

/**
 * Nearest published step, plus whether that step is close enough to use.
 * Returns null when the series has no parseable time.
 */
export function matchMetTimeseries(
  times: Array<string | null | undefined>,
  at: Date | null | undefined,
): MetTimeseriesMatch | null {
  if (!at || times.length === 0) return null;
  const target = at.getTime();
  if (!Number.isFinite(target)) return null;

  let best = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestAt = '';
  for (let index = 0; index < times.length; index++) {
    const parsed = Date.parse(times[index] ?? '');
    if (!Number.isFinite(parsed)) continue;
    const diff = Math.abs(parsed - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = index;
      bestAt = new Date(parsed).toISOString();
    }
  }
  if (best < 0) return null;
  return {
    index: best,
    matchedAt: bestAt,
    gapMs: bestDiff,
    inRange: bestDiff <= FORECAST_MATCH_MAX_GAP_MS,
  };
}

/**
 * Pick the MET locationforecast timeseries entry closest to an ETA.
 * Missing or invalid times keep the first entry (current-conditions behavior).
 */
export function selectMetTimeseriesIndex(
  times: Array<string | null | undefined>,
  at?: Date | null,
): number {
  if (!at || times.length === 0) return 0;
  const target = at.getTime();
  if (!Number.isFinite(target)) return 0;

  let best = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let index = 0; index < times.length; index++) {
    const parsed = Date.parse(times[index] ?? '');
    if (!Number.isFinite(parsed)) continue;
    const diff = Math.abs(parsed - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = index;
    }
  }
  return best;
}
