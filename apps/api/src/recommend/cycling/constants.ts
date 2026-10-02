/**
 * Cycling exposure constants. Explainable clothing proxies, not a medical
 * "feels like" temperature and not a measured forecast-accuracy claim.
 *
 * These are not motorcycle airflow, cruise, or armour constants.
 * A cyclist has no fairing: meteorological wind is not scaled down.
 * Ride style is a coarse metabolic stand-in, not a power-meter reading.
 */

export const CYCLING_EXPOSURE = {
  /** Apparent airflow (m/s) below which no wind chill is applied. */
  windThresholdMs: 2,
  /** °C per m/s of apparent airflow above the threshold. */
  windChillPerMs: 0.4,
  /** Extra °C when the sample is already wet enough to matter. */
  wetPenaltyC: 1,
  /**
   * Heat added back onto exposure (°C) for each explicit style.
   * Hard effort can outweigh mild-air chill; easy does not.
   */
  metabolicOffsetC: {
    easy: 0.5,
    steady: 2,
    hard: 4.5,
  },
  /**
   * Ground speed only when no cycling geometry duration is available.
   * Not used to overwrite a provider distance/duration speed.
   */
  assumedSpeedKmh: {
    easy: 16,
    steady: 22,
    hard: 30,
  },
  extremeBelowC: -8,
  veryColdBelowC: -2,
  coldBelowC: 4,
  coolBelowC: 10,
} as const;

/** Wear a shell for sustained cold or rain at this torso warmth / water tier. */
export const CYCLING_SHELL = {
  wearWarmth: 3,
  wearWater: 3,
  packWater: 3,
} as const;
