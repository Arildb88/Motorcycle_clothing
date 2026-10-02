/**
 * Minutes represented by each sample on a user-drawn line.
 *
 * ETA already follows distance along that line. Each point takes half of
 * every leg that touches it, so a short leg stays a short slice of the
 * tour. This does not invent ski-router legs or a cabin stop.
 */
export function xcSampleDurationMin(
  timeProgress: number[],
  durationMin: number,
): number[] {
  const count = timeProgress.length;
  const total = Math.max(1, Math.round(durationMin));
  if (count === 0) return [];
  if (count === 1) return [total];

  const progress = timeProgress.map((value) =>
    Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)),
  );
  const legs: number[] = [];
  for (let index = 0; index < count - 1; index++) {
    legs.push(Math.max(0, progress[index + 1] - progress[index]) * total);
  }
  const raw = progress.map((_, index) => {
    if (index === 0) return legs[0] / 2;
    if (index === count - 1) return legs[count - 2] / 2;
    return legs[index - 1] / 2 + legs[index] / 2;
  });
  const rounded = raw.map((value) => Math.max(0, Math.round(value)));
  const drift = total - rounded.reduce((sum, value) => sum + value, 0);
  const last = rounded.length - 1;
  rounded[last] = Math.max(0, rounded[last] + drift);
  return rounded;
}
