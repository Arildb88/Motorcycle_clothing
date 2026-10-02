/**
 * Deterministic thermal feedback.
 *
 * A cold / comfortable / hot rating updates one activity's overall
 * PersonalOffset. The stored mean is a running average of a fixed step,
 * capped at ±3 °C. Recommendations apply n/(n+k) of that mean, with k = 6,
 * the same shrinkage the motorcycle engine already uses.
 *
 * One event from an empty offset therefore moves the applied bias by
 * 1/7 °C, not by the full step. Comfortable feedback pulls the mean toward
 * 0. No rating rewrites UserProfile.coldSensitivity.
 */

export const THERMAL_RATINGS = ['too_cold', 'ok', 'too_warm'] as const;
export type ThermalRating = (typeof THERMAL_RATINGS)[number];

/** °C-equivalent residual of one "for kald" or "for varm" event. */
export const THERMAL_FEEDBACK_STEP_C = 1;

/**
 * Same k as motorcycle personalShrinkageK. Kept equal by test so the
 * applied bias cannot drift from the engine that already consumes it.
 */
export const THERMAL_SHRINKAGE_K = 6;

/** Stored mean stays inside the band the feedback writer already used. */
export const THERMAL_MEAN_CAP_C = 3;

export type ThermalOffset = {
  n: number;
  meanResidual: number;
};

const RESIDUAL_C: Record<string, number> = {
  too_cold: THERMAL_FEEDBACK_STEP_C,
  slightly_cold: THERMAL_FEEDBACK_STEP_C / 2,
  ok: 0,
  slightly_warm: -THERMAL_FEEDBACK_STEP_C / 2,
  too_warm: -THERMAL_FEEDBACK_STEP_C,
};

export function thermalResidualC(rating: string): number {
  return RESIDUAL_C[rating] ?? 0;
}

export function clampThermalMean(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-THERMAL_MEAN_CAP_C, Math.min(THERMAL_MEAN_CAP_C, value));
}

export function nextThermalOffset(
  previous: ThermalOffset | null | undefined,
  rating: string,
): ThermalOffset {
  const prevN =
    previous != null && Number.isFinite(previous.n) && previous.n > 0
      ? previous.n
      : 0;
  const prevMean = clampThermalMean(previous?.meanResidual ?? 0);
  const nextN = prevN + 1;
  const raw = (prevMean * prevN + thermalResidualC(rating)) / nextN;
  return { n: nextN, meanResidual: clampThermalMean(raw) };
}

/**
 * Bias subtracted from exposure °C. Positive means the person runs cold,
 * so the same air temperature demands more warmth. Zero samples apply 0
 * even when a stale mean is stored.
 */
export function appliedThermalBiasC(
  offset: ThermalOffset | null | undefined,
): number {
  const n = offset?.n ?? 0;
  if (!(n > 0) || !Number.isFinite(n)) return 0;
  const mean = clampThermalMean(offset?.meanResidual ?? 0);
  return (n / (n + THERMAL_SHRINKAGE_K)) * mean;
}

/** Largest applied change one extreme rating can make from an empty offset. */
export function maxOneEventAppliedC(): number {
  return THERMAL_FEEDBACK_STEP_C / (1 + THERMAL_SHRINKAGE_K);
}
