/**
 * Alpine / snowboard exposure constants.
 *
 * These are explainable clothing proxies, not a measured waiting-versus-descent
 * split and not a resort or avalanche model. The plan leaves that split open.
 * Worn clothing follows the colder site and the upper-mountain wind. A blend
 * toward the village would dress for the base while the rider waits at the top.
 */

export const ALPINE_DISCIPLINES = ['alpine_skiing', 'snowboarding'] as const;
export type AlpineDiscipline = (typeof ALPINE_DISCIPLINES)[number];

/** lift: groomers and lift queues. hike: more time waiting in the wind. base: stay low. */
export const ALPINE_EXPOSURE_MODES = ['lift', 'hike', 'base'] as const;
export type AlpineExposureMode = (typeof ALPINE_EXPOSURE_MODES)[number];

/**
 * °C added before wind chill. Lift queues are low metabolic heat.
 * Hiking up adds a little heat and is still not a descent-speed model.
 */
export const ALPINE_METABOLIC_OFFSET_C: Record<AlpineExposureMode, number> = {
  lift: 0.5,
  hike: 1.5,
  base: 0.5,
};

/**
 * Extra wind (m/s) applied only in hike mode.
 * Stand-in for more stationary time in the wind. Not a measured constant.
 */
export const ALPINE_HIKE_EXTRA_WIND_MS = 2;

export const ALPINE_EXPOSURE = {
  /** Wind (m/s) below which no chill is applied. Stationary, no travel speed. */
  windThresholdMs: 2,
  /** °C per m/s above the threshold. No motorcycle fairing. */
  windChillPerMs: 1.1,
  wetExposurePenaltyC: 1.5,
  rainProbWetThreshold: 40,
  precipMmWetThreshold: 0.2,
  /**
   * A session at least this long is sampled at start, middle, and end.
   * Shorter sessions use the start time only.
   */
  longSessionMin: 180,
  /** Air-temperature gap (°C) that is large enough to pack a change of layer. */
  temperatureSpreadC: 6,
} as const;

/** Warmth tier from alpine exposure °C. Colder than a moving ride: the rider is waiting. */
export const ALPINE_WARMTH_BELOW_C = {
  extreme: -15,
  veryCold: -8,
  cold: -2,
  cool: 4,
} as const;

export function isAlpineDiscipline(value: string): value is AlpineDiscipline {
  return (ALPINE_DISCIPLINES as readonly string[]).includes(value);
}
