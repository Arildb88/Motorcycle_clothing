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
 *
 * Optional torso and legs ratings use the same step, cap, and shrinkage on
 * their own PersonalOffset rows. They do not copy the overall residual, and
 * a zone bias changes only that zone's warmth demand.
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

/** Body zones that accept optional comfort feedback. */
export const THERMAL_FEEDBACK_ZONES = ['torso', 'legs'] as const;
export type ThermalFeedbackZone = (typeof THERMAL_FEEDBACK_ZONES)[number];

/** Extra cold bias, in °C, applied only to the named zone. Zero is no change. */
export type ZoneColdBiasC = {
  torso: number;
  legs: number;
};

export const ZERO_ZONE_COLD_BIAS: ZoneColdBiasC = { torso: 0, legs: 0 };

export function isThermalFeedbackZone(
  zone: string,
): zone is ThermalFeedbackZone {
  return (THERMAL_FEEDBACK_ZONES as readonly string[]).includes(zone);
}

export function zoneColdBiasC(
  zone: string,
  bias: ZoneColdBiasC | null | undefined,
): number {
  if (!bias) return 0;
  const value = zone === 'torso' ? bias.torso : zone === 'legs' ? bias.legs : 0;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clampWarmthTier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

/**
 * Warmth tier for one body zone.
 *
 * A zero bias returns `baseWarmth`, so existing overall-only demand stays
 * unchanged. A non-zero bias re-reads only this zone through the activity's
 * own warmth function at `exposure - bias`. Hands and every other zone keep
 * `baseWarmth`.
 */
export function adjustedZoneWarmth(input: {
  zone: string;
  baseWarmth: number;
  samples: Array<{ exposureC: number; weight: number }>;
  warmthFromExposure: (exposureC: number) => number;
  bias: ZoneColdBiasC | null | undefined;
  peak?: boolean;
}): number {
  const extra = zoneColdBiasC(input.zone, input.bias);
  if (extra === 0 || input.samples.length === 0) return input.baseWarmth;
  const warmths = input.samples.map((sample) =>
    input.warmthFromExposure(sample.exposureC - extra),
  );
  if (input.peak) return clampWarmthTier(Math.max(...warmths));
  const weight = input.samples.reduce(
    (sum, sample) => sum + Math.max(0, sample.weight),
    0,
  );
  if (!(weight > 0)) return input.baseWarmth;
  const mean =
    input.samples.reduce(
      (sum, sample, index) => sum + warmths[index] * Math.max(0, sample.weight),
      0,
    ) / weight;
  return clampWarmthTier(mean);
}

export function withZoneColdBias<T extends { zone: string; warmth: number }>(
  zones: T[],
  baseWarmth: number,
  samples: Array<{ exposureC: number; weight: number }>,
  warmthFromExposure: (exposureC: number) => number,
  bias: ZoneColdBiasC | null | undefined,
  peak = false,
): T[] {
  if (zoneColdBiasC('torso', bias) === 0 && zoneColdBiasC('legs', bias) === 0) {
    return zones;
  }
  return zones.map((zone) => {
    if (zone.zone !== 'torso' && zone.zone !== 'legs') return zone;
    const warmth = adjustedZoneWarmth({
      zone: zone.zone,
      baseWarmth,
      samples,
      warmthFromExposure,
      bias,
      peak,
    });
    return warmth === zone.warmth ? zone : { ...zone, warmth };
  });
}
