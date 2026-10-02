/**
 * Cycling apparent airflow.
 *
 * Vector mode when both travel heading and meteorological wind-from exist.
 * Heading is degrees clockwise from north, matching the routing bearing.
 * Scalar mode adds ground speed and wind speed and does not invent a direction.
 * There is no fairing or wind-protection factor.
 */

export type CyclingAirflowMode = 'vector' | 'scalar_sum';

export type CyclingAirflow = {
  apparentAirflowMs: number;
  mode: CyclingAirflowMode;
  windDirectionUsed: boolean;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function cyclingApparentAirflow(input: {
  expectedSpeedKmh: number;
  windSpeedMs: number;
  windFromDeg?: number | null;
  headingDeg?: number | null;
}): CyclingAirflow {
  const speedMs = Math.max(0, input.expectedSpeedKmh) / 3.6;
  const windMs = Math.max(0, input.windSpeedMs);
  const hasDirection =
    input.windFromDeg != null &&
    Number.isFinite(input.windFromDeg) &&
    input.headingDeg != null &&
    Number.isFinite(input.headingDeg);

  if (!hasDirection) {
    return {
      apparentAirflowMs: speedMs + windMs,
      mode: 'scalar_sum',
      windDirectionUsed: false,
    };
  }

  const heading = Number(input.headingDeg);
  const windToward = (Number(input.windFromDeg) + 180) % 360;
  const north = speedMs * Math.cos(toRad(heading));
  const east = speedMs * Math.sin(toRad(heading));
  const windNorth = windMs * Math.cos(toRad(windToward));
  const windEast = windMs * Math.sin(toRad(windToward));
  return {
    apparentAirflowMs: Math.hypot(north - windNorth, east - windEast),
    mode: 'vector',
    windDirectionUsed: true,
  };
}

/** Bearing clockwise from north, or null when the two points are the same. */
export function bearingDeg(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): number | null {
  if (from.lat === to.lat && from.lon === to.lon) return null;
  const toRadLat = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadLat(from.lat);
  const lat2 = toRadLat(to.lat);
  const dLon = toRadLat(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function sampleHeadingsDeg(
  points: Array<{ lat: number; lon: number }>,
): Array<number | null> {
  if (points.length === 0) return [];
  if (points.length === 1) return [null];
  return points.map((point, index) => {
    if (index < points.length - 1) {
      return bearingDeg(point, points[index + 1]);
    }
    return bearingDeg(points[index - 1], point);
  });
}
