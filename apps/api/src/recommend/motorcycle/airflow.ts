/**
 * Apparent airflow proxy for motorcycle exposure / wind demand.
 *
 * Engineering comfort proxy — not medical wind-chill and not CFD-accurate.
 *
 * Vector mode (when headingDeg + windFromDeg are both present):
 *   vehicle velocity relative to meteorological wind velocity.
 *
 * Scalar fallback (missing heading or wind direction):
 *   vehicleSpeedMs + effectiveMetWindMs
 *   (explicitly recorded as scalar_sum — never invents wind direction)
 *
 * Future MotorcycleProfile.windProtectionFactor (0..1) can scale the
 * meteorological wind component without rewriting callers — windshield /
 * hand guards / fairing stay out of scope for this task.
 */

export type ApparentAirflowMode = 'vector' | 'scalar_sum';

export type ApparentAirflow = {
  apparentAirflowMs: number;
  mode: ApparentAirflowMode;
  windDirectionUsed: boolean;
  vehicleSpeedMs: number;
  effectiveMetWindMs: number;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function computeApparentAirflow(input: {
  expectedSpeedKmh: number;
  windSpeedMs: number;
  /** Meteorological wind FROM direction (degrees clockwise from north). */
  windFromDeg?: number | null;
  /** Vehicle travel heading (degrees clockwise from north). */
  headingDeg?: number | null;
  /**
   * Future hook: 0 = fully exposed, 1 = fully shielded from met wind.
   * Scales meteorological wind only (not vehicle motion).
   */
  windProtectionFactor?: number | null;
}): ApparentAirflow {
  const vehicleSpeedMs = Math.max(0, input.expectedSpeedKmh) / 3.6;
  const protection = clamp01(input.windProtectionFactor ?? 0);
  const effectiveMetWindMs = Math.max(0, input.windSpeedMs) * (1 - protection);

  const hasDir =
    input.windFromDeg != null &&
    Number.isFinite(input.windFromDeg) &&
    input.headingDeg != null &&
    Number.isFinite(input.headingDeg);

  if (hasDir) {
    // Wind FROM deg → velocity toward = +180°.
    const windTowardDeg = (Number(input.windFromDeg) + 180) % 360;
    const headingDeg = Number(input.headingDeg);
    const vx = vehicleSpeedMs * Math.cos(toRad(headingDeg));
    const vy = vehicleSpeedMs * Math.sin(toRad(headingDeg));
    const wx = effectiveMetWindMs * Math.cos(toRad(windTowardDeg));
    const wy = effectiveMetWindMs * Math.sin(toRad(windTowardDeg));
    const apparentAirflowMs = Math.hypot(vx - wx, vy - wy);
    return {
      apparentAirflowMs,
      mode: 'vector',
      windDirectionUsed: true,
      vehicleSpeedMs,
      effectiveMetWindMs,
    };
  }

  return {
    apparentAirflowMs: vehicleSpeedMs + effectiveMetWindMs,
    mode: 'scalar_sum',
    windDirectionUsed: false,
    vehicleSpeedMs,
    effectiveMetWindMs,
  };
}
