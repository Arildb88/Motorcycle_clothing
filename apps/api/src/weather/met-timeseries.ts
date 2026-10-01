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
