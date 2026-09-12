/**
 * Motorcycle exposure constants — explainable, not medical "feels like".
 *
 * Assumptions (documented for M3):
 * - Riding airflow adds chill beyond ambient wind (speedAirflow).
 * - Wind above a mild threshold cools roughly linearly.
 * - Light rain / high precip probability adds a small wet-exposure penalty.
 * - Values are ordinal engineering constants for clothing demand, not clo science.
 */

export const MOTORCYCLE_EXPOSURE = {
  /** Wind (m/s) below which no wind chill is applied. */
  windThresholdMs: 3,
  /** °C penalty per m/s of wind above threshold. */
  windChillPerMs: 0.55,
  /**
   * Default assumed cruising speed contribution when no telemetry (km/h).
   * Used only to derive a modest airflow chill — not GPS-derived.
   */
  defaultCruiseKmh: 70,
  /** °C penalty per 10 km/h of assumed airflow above 30 km/h. */
  airflowChillPer10Kmh: 0.35,
  /** Extra °C penalty when precip mm is meaningful or rain prob high. */
  wetExposurePenaltyC: 1.5,
  rainProbWetThreshold: 45,
  precipMmWetThreshold: 0.3,
  /** Personal bias shrinkage k (same spirit as existing personalWeight). */
  personalShrinkageK: 6,
  /** Evidence gate before any personal claim voice. */
  personalClaimMinN: 3,
} as const;

/** Demand tier thresholds on motorcycleExposureC (lower = colder = higher demand). */
export const DEMAND_FROM_EXPOSURE_C = {
  /** exposure ≥ this → warmth demand 1 (minimal) */
  mildAboveC: 16,
  coolBelowC: 12,
  coldBelowC: 6,
  veryColdBelowC: 0,
  extremeBelowC: -6,
} as const;

/** Short extreme: fraction of total duration OR absolute minutes. */
export const SHORT_EXTREME = {
  maxFractionOfRide: 0.18,
  maxAbsoluteMin: 20,
} as const;

/** Vent advice thresholds on sustained motorcycle exposure °C. */
export const VENT_ADVICE = {
  closeBelowC: 10,
  openAboveC: 18,
} as const;

/** Rain: sustained WEAR vs short PACK. */
export const RAIN_POLICY = {
  wearProbPct: 55,
  wearPrecipMm: 0.8,
  packProbPct: 35,
  packPrecipMm: 0.2,
} as const;
