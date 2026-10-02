/**
 * Cross-country exposure constants. These are clothing proxies, not a
 * measured feels-like model and not wax, grooming, or heart-rate advice.
 *
 * Assumptions, not measurements:
 * - Intensity is an explicit easy/steady/hard input. It is not inferred
 *   from speed, and classic versus skate does not change these numbers.
 * - Metabolic heat is a small positive offset. A climb adds a little more.
 *   Neither value is a wattage.
 * - Wind chill uses the forecast wind at the sample. Ski speed is not
 *   invented, and motorcycle airflow coefficients are not used.
 * - A short colder sample is a pack item. It does not dress the whole tour.
 */

export const XC_INTENSITIES = ['easy', 'steady', 'hard'] as const;
export type XcIntensity = (typeof XC_INTENSITIES)[number];

export const XC_STYLES = ['classic', 'skate'] as const;
export type XcStyle = (typeof XC_STYLES)[number];

/** °C added to air temperature before wind chill. Higher effort, more heat. */
export const XC_METABOLIC_OFFSET_C: Record<XcIntensity, number> = {
  easy: 1,
  steady: 2.5,
  hard: 4.5,
};

export const XC_EXPOSURE = {
  /** Forecast wind (m/s) below which no wind chill is applied. */
  windThresholdMs: 2,
  /**
   * °C per m/s of forecast wind above the threshold.
   * Not a motorcycle fairing factor and not a cycling road-speed sum.
   */
  windChillPerMs: 0.7,
  wetExposurePenaltyC: 1,
  rainProbWetThreshold: 40,
  precipMmWetThreshold: 0.2,
  /** Extra metabolic °C while the line is climbing. Not measured. */
  climbExtraC: 1.5,
  /** Rise, in metres, before a sample counts as a climb. */
  climbRiseM: 15,
  /** A colder sample at or under this many minutes can be packed. */
  shortExtremeMaxMin: 15,
  /** Or at or under this share of the tour, when that is shorter. */
  shortExtremeMaxFraction: 0.2,
  /** Used only when the saved route has no positive duration. */
  defaultDurationMin: 120,
} as const;

/** Warmth tier from XC exposure °C, which already includes metabolic heat. */
export const XC_WARMTH_BELOW_C = {
  extreme: -5,
  veryCold: 0,
  cold: 6,
  cool: 12,
} as const;
