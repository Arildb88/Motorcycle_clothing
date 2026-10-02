/**
 * Cycling exposure constants — explainable clothing proxies, not medical
 * "feels like" and not a power-meter model.
 *
 * Assumptions:
 * - Ride style is an explicit easy/steady/hard input. It is not inferred
 *   from speed. The speeds below are coarse stand-ins used only when the
 *   cycling route profile did not return a travel speed.
 * - A cyclist is fully exposed. There is no motorcycle fairing factor.
 * - Metabolic heat is a small positive offset so a hard effort in mild air
 *   can overheat a shell. It is not a wattage calculation.
 * - One short hail or cold cell must not set the worn outfit for the ride.
 */

export const CYCLING_INTENSITIES = ['easy', 'steady', 'hard'] as const;
export type CyclingIntensity = (typeof CYCLING_INTENSITIES)[number];

/** km/h used only when no cycling route profile supplied a travel speed. */
export const CYCLING_STYLE_SPEED_KMH: Record<CyclingIntensity, number> = {
  easy: 18,
  steady: 25,
  hard: 32,
};

/**
 * °C added to air temperature before wind chill.
 * Higher effort produces more metabolic heat.
 */
export const CYCLING_METABOLIC_OFFSET_C: Record<CyclingIntensity, number> = {
  easy: 1,
  steady: 2.5,
  hard: 5,
};

export const CYCLING_EXPOSURE = {
  /** Apparent airflow (m/s) below which no wind chill is applied. */
  windThresholdMs: 1.5,
  /** °C per m/s of apparent airflow above the threshold. Cyclists have no fairing. */
  windChillPerMs: 0.9,
  wetExposurePenaltyC: 1.2,
  rainProbWetThreshold: 40,
  precipMmWetThreshold: 0.2,
  /** Precipitation probability below this is "low" for the overheat rule. */
  lowRainProbPct: 30,
  /** Short extreme: fraction of the ride or an absolute cap. */
  shortExtremeMaxFraction: 0.18,
  shortExtremeMaxMin: 20,
} as const;

/** Warmth tier from cycling exposure °C (already includes metabolic offset). */
export const CYCLING_WARMTH_BELOW_C = {
  extreme: 0,
  veryCold: 6,
  cold: 12,
  cool: 18,
} as const;
